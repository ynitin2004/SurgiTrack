const mongoose = require('mongoose');
const Surgeon = require('../models/Surgeon');
const store = require('../store/store');
const sd = require('../services/surgeryData');
const { cleanExpertise, buildSurgeonProfile } = require('../services/surgeonProfile');
const report = require('../services/report');

// GET /api/surgeons?page=1&limit=20&search=&sort=surgeries|name
// surgeon_info is small (~1.2k docs), so sorting by surgery count happens in
// memory — no indexes are needed (the DB is read-only for this app).
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const { search } = req.query;
  const sortBy = req.query.sort === 'name' ? 'name' : 'surgeries';

  const match = {};
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ surgeonName: rx }, { areaOfExpertise: rx }];
  }

  const [surgeons, counts] = await Promise.all([
    Surgeon.find(match, { surgeonName: 1, areaOfExpertise: 1, alignedHospital: 1, hospitalAlignedDate: 1 }).lean(),
    sd.countsBySurgeon(),
  ]);

  const rows = surgeons.map((s) => ({ ...s, surgeryCount: counts.get(String(s._id)) || 0 }));
  const byName = (a, b) => (a.surgeonName || '').localeCompare(b.surgeonName || '', 'en', { sensitivity: 'base' });
  rows.sort(sortBy === 'name' ? byName : (a, b) => b.surgeryCount - a.surgeryCount || byName(a, b));

  const pageRows = rows.slice((page - 1) * limit, page * limit);
  const hospitalIds = pageRows.map((s) => s.alignedHospital).filter(Boolean);
  const hospitals = hospitalIds.length
    ? await mongoose.connection.db
        .collection('hospitals')
        .find({ _id: { $in: hospitalIds } }, { projection: { hospitalName: 1 } })
        .toArray()
    : [];
  const hospitalName = new Map(hospitals.map((h) => [String(h._id), h.hospitalName]));

  // which profiles already have a portal account (shown when approving users)
  const linked = new Map(
    store
      .load()
      .users.filter((u) => u.surgeonId && u.status !== 'disabled')
      .map((u) => [u.surgeonId, u.email])
  );

  const items = pageRows.map(({ alignedHospital, ...s }) => ({
    ...s,
    areaOfExpertise: cleanExpertise(s.areaOfExpertise),
    hospitalName: alignedHospital ? hospitalName.get(String(alignedHospital)) || null : null,
    linkedAccount: linked.get(String(s._id)) || null,
  }));

  res.json({ items, total: rows.length, page, pages: Math.ceil(rows.length / limit) });
}

// GET /api/surgeons/:id — profile, category mix, instrument usage, recent surgeries
async function detail(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid surgeon id' });
  const profile = await buildSurgeonProfile(id);
  if (!profile) return res.status(404).json({ message: 'Surgeon not found' });
  res.json(profile);
}

// GET /api/surgeons/:id/report/periods · /api/surgeons/:id/report?period=&value=
async function reportPeriods(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid surgeon id' });
  res.json(await report.reportPeriods(req.params.id));
}

async function getReport(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid surgeon id' });
  const data = await report.buildSurgeonReport(req.params.id, req.query.period, req.query.value);
  if (!data) return res.status(404).json({ message: 'Surgeon not found' });
  res.json(data);
}

module.exports = { list, detail, reportPeriods, getReport };
