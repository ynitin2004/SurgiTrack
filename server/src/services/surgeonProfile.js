const mongoose = require('mongoose');
const Surgeon = require('../models/Surgeon');
const sd = require('./surgeryData');

// Some surgeon_info docs hold a raw ObjectId string in areaOfExpertise.
const cleanExpertise = (v) => (typeof v === 'string' && !/^[a-f0-9]{24}$/i.test(v) ? v : null);

const countSurgeries = (id) => sd.coll().countDocuments(sd.surgeonMatch(id));

// Instrument names have stray whitespace/casing differences ("Cautery Hook"
// vs "Cautery Hook  ") and empty/null names.
const INSTRUMENT_STAGES = [
  { $unwind: `$${sd.F.instruments}` },
  {
    $addFields: {
      _name: {
        $trim: {
          input: {
            $convert: { input: `$${sd.F.instruments}.instrumentName`, to: 'string', onError: '', onNull: '' },
          },
        },
      },
    },
  },
  { $match: { _name: { $nin: ['', '-', 'N/A', 'NA', 'Data Unavailable'] } } },
  // collapse inner runs of spaces, group case-insensitively, keep a display name
  {
    $addFields: {
      _key: {
        $toLower: {
          $reduce: {
            input: { $filter: { input: { $split: ['$_name', ' '] }, cond: { $ne: ['$$this', ''] } } },
            initialValue: '',
            in: { $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ' '] }, '$$this'] },
          },
        },
      },
    },
  },
  { $group: { _id: '$_key', name: { $first: '$_name' }, count: { $sum: 1 } } },
  { $sort: { count: -1, name: 1 } },
];

async function instrumentUsage(id, limit = 8) {
  const rows = await sd.coll().aggregate([{ $match: sd.surgeonMatch(id) }, ...INSTRUMENT_STAGES]).toArray();
  return {
    top: rows.slice(0, limit).map((r) => ({ name: r.name.replace(/\s+/g, ' '), count: r.count })),
    distinct: rows.length,
  };
}

// [{ _id: procedureTypeId, count }] -> top procedures by name. A few
// procedure_types share a name, so merge by the cleaned, lower-cased name.
function topProcedures(rows, r, limit = 3) {
  const byName = new Map();
  for (const g of rows) {
    const name = r.procedures.get(sd.idKey(g._id))?.name;
    if (!name) continue;
    const key = name.toLowerCase();
    const cur = byName.get(key) || { name, count: 0 };
    cur.count += g.count;
    byName.set(key, cur);
  }
  const all = [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { top: all.slice(0, limit), distinct: all.length };
}

async function buildSurgeonProfile(id) {
  const surgeon = await Surgeon.findById(id).lean();
  if (!surgeon) return null;
  const match = sd.surgeonMatch(id);

  const [hospital, recentDocs, facets, instruments, r] = await Promise.all([
    surgeon.alignedHospital
      ? mongoose.connection.db
          .collection('hospitals')
          .findOne({ _id: surgeon.alignedHospital }, { projection: { hospitalName: 1 } })
      : null,
    sd
      .coll()
      .find({ ...match, ...sd.validDateMatch() }, { projection: sd.ROW_PROJECTION })
      .sort({ [sd.F.date]: -1, _id: -1 })
      .limit(10)
      .toArray(),
    sd
      .coll()
      .aggregate([
        { $match: match },
        {
          $facet: {
            total: [{ $count: 'n' }],
            byCategory: [{ $group: { _id: sd.CATEGORY_KEY, count: { $sum: 1 } } }],
            byProcedure: [{ $group: { _id: `$${sd.F.procedure}`, count: { $sum: 1 } } }],
            hospitals: [
              { $match: { [sd.F.hospital]: { $ne: null } } },
              {
                $group: {
                  _id: `$${sd.F.hospital}`,
                  count: { $sum: 1 },
                  first: { $min: `$${sd.F.date}` },
                  last: { $max: `$${sd.F.date}` },
                },
              },
              { $sort: { count: -1 } },
            ],
          },
        },
      ])
      .toArray(),
    instrumentUsage(id),
    sd.refs(),
  ]);

  const f = facets[0];
  const procedures = topProcedures(f.byProcedure, r);
  const recentSurgeries = await sd.toRows(recentDocs);

  // Only hospitals that exist in the hospitals collection count as "served";
  // cases pointing at an unknown hospital id are reported separately.
  const validTs = (d) => (d instanceof Date && d >= sd.MIN_VALID_DATE ? d.getTime() : null);
  const hospitalsServed = f.hospitals
    .filter((h) => r.hospitals.has(String(h._id)))
    .map((h) => ({ name: r.hospitals.get(String(h._id)), count: h.count, first: validTs(h.first), last: validTs(h.last) }));
  const unlistedHospitalCases = f.hospitals.filter((h) => !r.hospitals.has(String(h._id))).reduce((n, h) => n + h.count, 0);

  return {
    surgeon: {
      _id: surgeon._id,
      surgeonName: surgeon.surgeonName,
      areaOfExpertise: cleanExpertise(surgeon.areaOfExpertise),
      hospitalName: hospital?.hospitalName || null,
      hospitalAlignedDate: surgeon.hospitalAlignedDate,
    },
    surgeryCount: f.total[0]?.n || 0,
    hospitalsServed: hospitalsServed.length,
    hospitalsServedList: hospitalsServed,
    unlistedHospitalCases,
    distinctProcedures: procedures.distinct,
    topProcedures: procedures.top,
    lastSurgeryDate: recentSurgeries[0]?.date_of_surgery ?? null,
    byCategory: await sd.categoryCounts(f.byCategory),
    instruments: instruments.top,
    distinctInstruments: instruments.distinct,
    recentSurgeries,
  };
}

module.exports = { cleanExpertise, countSurgeries, buildSurgeonProfile, INSTRUMENT_STAGES, topProcedures };
