const sd = require('../services/surgeryData');
const { isTeammate } = require('../services/team');

const { F, DAY } = sd;
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const ids = (map, test) => [...map.entries()].filter(([, v]) => v && test(v)).map(([id]) => sd.toObjectId(id));

// GET /api/surgeries?page=1&limit=20&search=&category=&hospital=&surgeonId=&from=&to=&sort=-date_of_surgery
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const { search, category, hospital, from, to } = req.query;
  // surgeons see their own cases, or a teammate's (same aligned hospital) when asked
  let surgeonId = req.query.surgeonId;
  if (req.user.role === 'surgeon') {
    if (surgeonId && surgeonId !== req.user.surgeonId && !(await isTeammate(req.user.surgeonId, surgeonId))) {
      return res.status(403).json({ message: 'This surgeon is not part of your hospital team' });
    }
    surgeonId = surgeonId || req.user.surgeonId;
  }
  const r = await sd.refs();

  const and = [];
  if (surgeonId) {
    if (!sd.isId(surgeonId)) return res.status(400).json({ message: 'Invalid surgeon id' });
    and.push(sd.surgeonMatch(surgeonId));
  }
  if (category) {
    const catIds = [...r.categories.entries()].filter(([, key]) => key === category).map(([id]) => id);
    // match on the category id, or on the procedure type when the category id is missing
    const procIds = ids(r.procedures, (p) => catIds.includes(p.categoryId));
    and.push(
      category === 'unknown'
        ? { [F.category]: { $nin: [...r.categories.keys()].flatMap((id) => [sd.toObjectId(id), id]) } }
        : {
            $or: [
              { [F.category]: { $in: catIds.flatMap((id) => [sd.toObjectId(id), id]) } },
              { [F.category]: null, [F.procedure]: { $in: procIds } },
            ],
          }
    );
  }
  if (hospital) {
    // accept a hospital id (current UI) or a hospital label (older links)
    and.push({
      [F.hospital]: { $in: sd.isId(hospital) ? [sd.toObjectId(hospital)] : ids(r.hospitals, (l) => l === hospital) },
    });
  }
  if (search?.trim()) {
    const rx = new RegExp(escapeRx(search.trim()), 'i');
    const or = [
      { [F.procedure]: { $in: ids(r.procedures, (p) => rx.test(p.name || '') || rx.test(p.code || '')) } },
      { [F.hospital]: { $in: ids(r.hospitals, (l) => rx.test(l)) } },
      { [F.system]: { $in: ids(r.systems, (s) => rx.test(s)) } },
    ];
    if (req.user.role === 'admin') or.push({ [F.surgeon]: { $in: ids(r.surgeons, (n) => rx.test(n)) } });
    and.push({ $or: or });
  }
  if ((from && !DATE_RX.test(from)) || (to && !DATE_RX.test(to))) {
    return res.status(400).json({ message: 'Invalid date' });
  }
  const fromD = from ? new Date(`${from}T00:00:00Z`) : null;
  const toD = to ? new Date(new Date(`${to}T00:00:00Z`).getTime() + DAY) : null;
  if ((fromD && Number.isNaN(fromD.getTime())) || (toD && Number.isNaN(toD.getTime()))) {
    return res.status(400).json({ message: 'Invalid date' });
  }
  if (fromD || toD) {
    and.push({ [F.date]: { ...(fromD ? { $gte: fromD } : {}), ...(toD ? { $lt: toD } : {}) } });
  }

  const filter = and.length ? { $and: and } : {};
  const dir = req.query.sort === 'date_of_surgery' ? 1 : -1;

  const [docs, total] = await Promise.all([
    sd
      .coll()
      .find(filter, { projection: sd.ROW_PROJECTION })
      .sort({ [F.date]: dir, _id: dir })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    sd.coll().countDocuments(filter),
  ]);

  res.json({ items: await sd.toRows(docs), total, page, pages: Math.ceil(total / limit) });
}

// GET /api/surgeries/filters — values for the filter dropdowns
async function filters(req, res) {
  const [catIds, hospitalIds, r] = await Promise.all([
    sd.coll().distinct(F.category),
    sd.coll().distinct(F.hospital),
    sd.refs(),
  ]);
  const categories = new Set(catIds.map((id) => r.categories.get(sd.idKey(id))).filter(Boolean));
  const hospitals = hospitalIds
    .map((id) => ({ id: String(id), name: r.hospitals.get(String(id)) }))
    .filter((h) => h.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  res.json({ categories: [...categories].sort(), hospitals });
}

module.exports = { list, filters };
