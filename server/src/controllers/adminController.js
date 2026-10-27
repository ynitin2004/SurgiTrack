const mongoose = require('mongoose');
const Surgeon = require('../models/Surgeon');
const store = require('../store/store');
const users = require('../services/users');
const rewards = require('../services/rewards');
const notify = require('../sockets/notify');

async function surgeonNames(ids) {
  const valid = [...new Set(ids.filter((id) => id && mongoose.isValidObjectId(id)))];
  if (!valid.length) return new Map();
  const docs = await Surgeon.find({ _id: { $in: valid } }, { surgeonName: 1 }).lean();
  return new Map(docs.map((d) => [String(d._id), d.surgeonName]));
}

// Validates a surgeon profile id for linking: must exist and not already be
// linked to another enabled account.
async function checkSurgeonLink(surgeonId, exceptUserId) {
  if (!surgeonId || !mongoose.isValidObjectId(surgeonId)) return 'Choose the surgeon profile to link';
  const exists = await Surgeon.exists({ _id: surgeonId });
  if (!exists) return 'That surgeon profile does not exist';
  const owner = users.findSurgeonOwner(String(surgeonId), exceptUserId);
  if (owner) return `This surgeon profile is already linked to ${owner.email}`;
  return null;
}

// ---- users ------------------------------------------------------------------

async function listUsers(req, res) {
  const all = store.load().users.map(users.publicUser);
  const builtIn = users.publicUser(users.findById(users.ENV_ADMIN_ID));
  const names = await surgeonNames(all.map((u) => u.surgeonId));
  const items = [...(builtIn ? [builtIn] : []), ...all]
    .map((u) => ({ ...u, surgeonName: u.surgeonId ? names.get(u.surgeonId) || null : null }))
    .sort((a, b) => {
      const order = { pending: 0, active: 1, disabled: 2 };
      return order[a.status] - order[b.status] || (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  res.json({ items });
}

async function createUser(req, res) {
  const { name, email, password, role, surgeonId } = req.body || {};
  if (!['admin', 'surgeon'].includes(role)) return res.status(400).json({ message: 'Role must be admin or surgeon' });
  const errors = users.validateNewUser({ name, email, password }) || {};
  if (role === 'surgeon') {
    const linkError = await checkSurgeonLink(surgeonId);
    if (linkError) errors.surgeonId = linkError;
  }
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', errors });

  // re-check the link after the awaits above (another admin may have linked it)
  if (role === 'surgeon' && users.findSurgeonOwner(String(surgeonId))) {
    return res.status(409).json({ message: 'This surgeon profile was just linked to another account' });
  }
  const user = await users.createUser({
    name,
    email,
    password,
    role,
    status: 'active',
    surgeonId: role === 'surgeon' ? String(surgeonId) : null,
    createdBy: req.user.email,
  });
  res.status(201).json({ user: users.publicUser(user) });
}

// PATCH /api/admin/users/:id { action: approve|reject|disable|enable, surgeonId? }
async function updateUser(req, res) {
  const { id } = req.params;
  const { action, surgeonId } = req.body || {};
  if (id === users.ENV_ADMIN_ID) return res.status(400).json({ message: 'The built-in admin cannot be changed here' });
  if (id === req.user.id) return res.status(400).json({ message: 'You cannot change your own account' });

  const db = store.load();
  const user = db.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (action === 'approve') {
    if (user.status !== 'pending') return res.status(409).json({ message: 'Only pending accounts can be approved' });
    if (user.role === 'surgeon') {
      const linkError = await checkSurgeonLink(surgeonId, user.id);
      if (linkError) return res.status(400).json({ message: linkError });
      if (users.findSurgeonOwner(String(surgeonId), user.id)) {
        return res.status(409).json({ message: 'This surgeon profile was just linked to another account' });
      }
      user.surgeonId = String(surgeonId);
    }
    if (user.status !== 'pending' || !db.users.includes(user)) {
      return res.status(409).json({ message: 'This account was already handled' });
    }
    user.status = 'active';
    user.approvedAt = store.now();
    user.approvedBy = req.user.email;
  } else if (action === 'reject') {
    if (user.status !== 'pending') return res.status(409).json({ message: 'Only pending accounts can be rejected' });
    db.users.splice(db.users.indexOf(user), 1); // frees the email so they can register again
    await store.persist();
    return res.json({ deleted: true });
  } else if (action === 'disable') {
    if (user.status !== 'active') return res.status(409).json({ message: 'Only active accounts can be disabled' });
    user.status = 'disabled';
    notify.disconnectUser(user.id);
  } else if (action === 'enable') {
    if (user.status !== 'disabled') return res.status(409).json({ message: 'Only disabled accounts can be enabled' });
    if (user.surgeonId && users.findSurgeonOwner(user.surgeonId, user.id)) {
      return res.status(409).json({ message: 'Another account is now linked to this surgeon profile' });
    }
    user.status = 'active';
  } else {
    return res.status(400).json({ message: 'Unknown action' });
  }
  user.updatedAt = store.now();
  await store.persist();
  res.json({ user: users.publicUser(user) });
}

// ---- milestone gifts ---------------------------------------------------------

// GET /api/admin/gifts — every surgeon who reached a milestone, with gift status
async function listGifts(req, res) {
  res.json(await rewards.giftQueue());
}

// PATCH /api/admin/gifts/:surgeonId/:tier { status: dispatched|delivered|closed, gift?, adminNote? }
async function updateGift(req, res) {
  try {
    const gift = await rewards.updateGift({
      surgeonId: req.params.surgeonId,
      tier: req.params.tier,
      status: req.body?.status,
      gift: req.body?.gift,
      adminNote: req.body?.adminNote,
      admin: req.user.email,
    });
    notify.surgeon(gift.surgeonId, 'reward:update', { tier: gift.tier, status: gift.status });
    notify.admins('gift:updated', gift);
    res.json({ gift });
  } catch (err) {
    if (err instanceof rewards.GiftError) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}

// Badge counts for the admin header.
async function counts(req, res) {
  const db = store.load();
  res.json({
    pendingUsers: db.users.filter((u) => u.status === 'pending').length,
    pendingGifts: await rewards.pendingGiftCount(),
  });
}

module.exports = { listUsers, createUser, updateUser, listGifts, updateGift, counts };
