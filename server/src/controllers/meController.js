const store = require('../store/store');
const notify = require('../sockets/notify');
const { buildSurgeonProfile } = require('../services/surgeonProfile');
const rewards = require('../services/rewards');
const team = require('../services/team');
const sd = require('../services/surgeryData');
const mongoose = require('mongoose');
const report = require('../services/report');

// Surgeon-only endpoints. The surgeon id ALWAYS comes from the logged-in
// account, never from the request, so a surgeon can only see their own data.

async function profile(req, res) {
  const data = await buildSurgeonProfile(req.user.surgeonId);
  if (!data) return res.status(404).json({ message: 'Your linked surgeon profile no longer exists' });
  res.json(data);
}

async function getRewards(req, res) {
  res.json(await rewards.rewardState(req.user.surgeonId));
}

async function instrumentOptions(req, res) {
  res.json({ items: await rewards.instrumentCatalog() });
}

async function redeem(req, res) {
  const surgeonId = req.user.surgeonId;
  const milestone = Number(req.body?.milestone);
  const instrumentRaw = String(req.body?.instrument || '').replace(/\s+/g, ' ').trim();
  const note = String(req.body?.note || '').trim();

  if (!Number.isInteger(milestone) || milestone <= 0 || milestone % rewards.EVERY !== 0) {
    return res.status(400).json({ message: 'Invalid milestone' });
  }
  if (!instrumentRaw) return res.status(400).json({ message: 'Please choose an instrument' });
  if (note.length > 500) return res.status(400).json({ message: 'Note must be 500 characters or fewer' });

  const catalog = await rewards.instrumentCatalog();
  const instrument = catalog.find((n) => n.toLowerCase() === instrumentRaw.toLowerCase());
  if (!instrument) return res.status(400).json({ message: 'Please choose an instrument from the list' });

  // eligibility is always recomputed from the live surgery data
  const state = await rewards.rewardState(surgeonId);
  if (milestone > state.earned * rewards.EVERY) {
    return res.status(400).json({ message: `You have not completed ${milestone} cases yet` });
  }

  // no await between this check and the insert -> double-clicks can't create duplicates
  if (rewards.activeRedemption(surgeonId, milestone)) {
    return res.status(409).json({ message: 'This reward has already been requested' });
  }
  const redemption = {
    id: store.newId(),
    surgeonId,
    userId: req.user.id,
    surgeonName: req.user.name,
    email: req.user.email,
    milestone,
    caseCountAtRequest: state.caseCount,
    instrument,
    note,
    status: 'requested',
    adminNote: '',
    createdAt: store.now(),
    updatedAt: store.now(),
    handledBy: null,
  };
  store.load().redemptions.push(redemption);
  await store.persist();

  notify.admins('redemption:new', redemption);
  notify.surgeon(surgeonId, 'reward:update', { milestone, status: 'requested' });
  res.status(201).json({ redemption });
}

// GET /me/team — every surgeon aligned to my hospital, with card stats
async function getTeam(req, res) {
  res.json(await team.teamOf(req.user.surgeonId));
}

// GET /me/team/:id — a teammate's full dashboard (same hospital only)
async function teamMember(req, res) {
  const { id } = req.params;
  if (!sd.isId(id)) return res.status(400).json({ message: 'Invalid surgeon id' });
  if (!(await team.isTeammate(req.user.surgeonId, id))) {
    return res.status(403).json({ message: 'This surgeon is not part of your hospital team' });
  }
  const data = await buildSurgeonProfile(id);
  if (!data) return res.status(404).json({ message: 'Surgeon not found' });
  res.json(data);
}

// GET /me/inventory/new — newest instrument types added to the catalogue
let inventoryCache = { at: 0, items: null };
async function newInventory(req, res) {
  if (!inventoryCache.items || Date.now() - inventoryCache.at > 10 * 60 * 1000) {
    const db = mongoose.connection.db;
    const [types, categories] = await Promise.all([
      db
        .collection('master_instrument_types')
        .find({}, { projection: { instrumentLabel: 1, shortLabel: 1, referenceCode: 1, instrumentCategoryId: 1, numberOfMaxUses: 1, createdAt: 1 } })
        .sort({ createdAt: -1, _id: -1 })
        .limit(6)
        .toArray(),
      db.collection('master_instrument_categories').find({}, { projection: { label: 1 } }).toArray(),
    ]);
    const catLabel = new Map(categories.map((c) => [String(c._id), c.label]));
    inventoryCache = {
      at: Date.now(),
      items: types
        .filter((t) => t.instrumentLabel)
        .map((t) => ({
          _id: String(t._id),
          name: String(t.instrumentLabel).trim(),
          shortLabel: t.shortLabel || null,
          referenceCode: t.referenceCode || null,
          category: catLabel.get(String(t.instrumentCategoryId)) || null,
          maxUses: Number.isFinite(t.numberOfMaxUses) ? t.numberOfMaxUses : null,
          addedAt: t.createdAt || t._id.getTimestamp(),
        })),
    };
  }
  res.json({ items: inventoryCache.items });
}

// Export reports: own (/me/report) or a teammate's (/me/team/:id/report)
async function reportTarget(req, res) {
  const id = req.params.id || req.user.surgeonId;
  if (!sd.isId(id)) {
    res.status(400).json({ message: 'Invalid surgeon id' });
    return null;
  }
  if (!(await team.isTeammate(req.user.surgeonId, id))) {
    res.status(403).json({ message: 'This surgeon is not part of your hospital team' });
    return null;
  }
  return id;
}

async function reportPeriods(req, res) {
  const id = await reportTarget(req, res);
  if (id) res.json(await report.reportPeriods(id));
}

async function getReport(req, res) {
  const id = await reportTarget(req, res);
  if (!id) return;
  const data = await report.buildSurgeonReport(id, req.query.period, req.query.value);
  if (!data) return res.status(404).json({ message: 'Surgeon not found' });
  res.json(data);
}

module.exports = {
  profile,
  getRewards,
  instrumentOptions,
  redeem,
  getTeam,
  teamMember,
  newInventory,
  reportPeriods,
  getReport,
};
