const mongoose = require('mongoose');
const Surgeon = require('../models/Surgeon');
const sd = require('./surgeryData');
const { cleanExpertise } = require('./surgeonProfile');

// A surgeon's "team" = every surgeon_info profile aligned to the same hospital
// (surgeon_info.alignedHospital). Surgeons may view their teammates' dashboards;
// the check always runs on the server against the logged-in account.

async function alignedHospitalOf(surgeonId) {
  if (!sd.isId(surgeonId)) return null;
  const me = await Surgeon.findById(surgeonId, { alignedHospital: 1 }).lean();
  return me?.alignedHospital || null;
}

// true when `otherId` is aligned to the same hospital as `surgeonId`
async function isTeammate(surgeonId, otherId) {
  if (!sd.isId(otherId)) return false;
  if (String(surgeonId) === String(otherId)) return true;
  const [mine, theirs] = await Promise.all([alignedHospitalOf(surgeonId), alignedHospitalOf(otherId)]);
  return Boolean(mine && theirs && String(mine) === String(theirs));
}

async function teamOf(surgeonId) {
  const hospitalId = await alignedHospitalOf(surgeonId);
  if (!hospitalId) return { hospital: null, members: [] };

  const [profiles, hospital, r] = await Promise.all([
    Surgeon.find({ alignedHospital: hospitalId }, { surgeonName: 1, areaOfExpertise: 1, hospitalAlignedDate: 1 }).lean(),
    mongoose.connection.db.collection('hospitals').findOne({ _id: hospitalId }, { projection: { hospitalName: 1 } }),
    sd.refs(),
  ]);
  const ids = profiles.map((p) => p._id);

  const [facets] = await sd
    .coll()
    .aggregate([
      { $match: { [sd.F.surgeon]: { $in: [...ids, ...ids.map(String)] } } },
      { $addFields: { _sid: { $toString: `$${sd.F.surgeon}` } } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: '$_sid',
                count: { $sum: 1 },
                last: {
                  $max: {
                    $cond: [
                      { $and: [{ $gte: [`$${sd.F.date}`, sd.MIN_VALID_DATE] }, { $lt: [`$${sd.F.date}`, sd.tomorrowUtc()] }] },
                      `$${sd.F.date}`,
                      null,
                    ],
                  },
                },
              },
            },
          ],
          byCategory: [{ $group: { _id: { s: '$_sid', c: sd.CATEGORY_KEY }, count: { $sum: 1 } } }],
          byProcedure: [{ $group: { _id: { s: '$_sid', p: `$${sd.F.procedure}` }, count: { $sum: 1 } } }],
        },
      },
    ])
    .toArray();

  const totals = new Map(facets.totals.map((t) => [t._id, t]));
  // top item per surgeon from [{ _id: { s, key }, count }]
  const topBy = (rows, keyOf, nameOf) => {
    const best = new Map();
    for (const row of rows) {
      const name = nameOf(keyOf(row._id));
      if (!name) continue;
      const perSurgeon = best.get(row._id.s) || new Map();
      perSurgeon.set(name, (perSurgeon.get(name) || 0) + row.count);
      best.set(row._id.s, perSurgeon);
    }
    return (sid) => {
      const m = best.get(sid);
      if (!m) return null;
      const [name, count] = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return { name, count };
    };
  };
  const topCategory = topBy(facets.byCategory, (k) => k.c, (c) => r.categories.get(sd.idKey(c)) || null);
  const topProcedure = topBy(facets.byProcedure, (k) => k.p, (p) => r.procedures.get(sd.idKey(p))?.name || null);

  const members = profiles
    .map((p) => {
      const id = String(p._id);
      const t = totals.get(id);
      return {
        _id: id,
        surgeonName: p.surgeonName,
        areaOfExpertise: cleanExpertise(p.areaOfExpertise),
        isMe: id === String(surgeonId),
        surgeryCount: t?.count || 0,
        lastSurgeryDate: t?.last ? t.last.getTime() : null,
        topCategory: topCategory(id),
        topProcedure: topProcedure(id),
      };
    })
    .sort(
      (a, b) =>
        b.surgeryCount - a.surgeryCount ||
        (a.surgeonName || '').localeCompare(b.surgeonName || '', 'en', { sensitivity: 'base' })
    );

  return {
    hospital: { _id: String(hospitalId), name: hospital?.hospitalName || r.hospitals.get(String(hospitalId)) || null },
    members,
  };
}

module.exports = { teamOf, isTeammate };
