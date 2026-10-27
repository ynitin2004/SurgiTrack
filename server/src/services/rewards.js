const Surgeon = require('../models/Surgeon');
const store = require('../store/store');
const sd = require('./surgeryData');
const { countSurgeries } = require('./surgeonProfile');

// Trophy badges + customised gifts. A surgeon is a Beginner (no badge) until
// 50 surgeries; each milestone below unlocks a trophy badge and a gift that the
// SSI team (admin) customises and sends. Keep in sync with client/src/utils/tier.js.
const MILESTONES = [
  { tier: 'bronze', label: 'Bronze', at: 50 },
  { tier: 'silver', label: 'Silver', at: 100 },
  { tier: 'gold', label: 'Gold', at: 200 },
  { tier: 'champion', label: 'Champion', at: 500 },
  { tier: 'legend', label: 'Legend', at: 1000 },
];

// Gift workflow per milestone. "preparing" is implicit (no record yet):
//   preparing -> dispatched (gift details required) -> delivered
//   preparing | dispatched -> closed (reason required, e.g. rewarded earlier)
// Re-saving a dispatched gift edits its details.
const TRANSITIONS = {
  preparing: ['dispatched', 'closed'],
  dispatched: ['dispatched', 'delivered', 'closed'],
  delivered: [],
  closed: [],
};
const OPEN = ['preparing', 'dispatched']; // gifts still on their way

const reachedFor = (count) => MILESTONES.filter((m) => count >= m.at);
const milestoneOf = (tier) => MILESTONES.find((m) => m.tier === tier) || null;
const giftsFor = (surgeonId) => store.load().rewards.filter((g) => g.surgeonId === String(surgeonId));

// public view of one reached milestone and its gift
function milestoneView(m, gift) {
  return {
    tier: m.tier,
    label: m.label,
    at: m.at,
    status: gift?.status || 'preparing',
    gift: gift?.gift || null,
    adminNote: gift?.adminNote || null,
    dispatchedAt: gift?.dispatchedAt || null,
    deliveredAt: gift?.deliveredAt || null,
    updatedAt: gift?.updatedAt || null,
  };
}

// Badge, progress to the next trophy and every unlocked gift for one surgeon.
async function rewardState(surgeonId) {
  const caseCount = await countSurgeries(surgeonId);
  const gifts = giftsFor(surgeonId);
  const reached = reachedFor(caseCount);
  const current = reached.at(-1) || null;
  const next = MILESTONES.find((m) => caseCount < m.at) || null;
  const from = current ? current.at : 0;
  const milestones = reached.map((m) => milestoneView(m, gifts.find((g) => g.tier === m.tier))).reverse();

  return {
    caseCount,
    tier: current ? { tier: current.tier, label: current.label, at: current.at } : null, // null = Beginner
    next: next ? { tier: next.tier, label: next.label, at: next.at } : null,
    casesToNext: next ? next.at - caseCount : 0,
    progress: next ? (caseCount - from) / (next.at - from) : 1,
    ladder: MILESTONES.map((m) => ({ ...m, reached: caseCount >= m.at })),
    milestones, // newest first
    openGifts: milestones.filter((m) => OPEN.includes(m.status)).length,
  };
}

// Admin worklist: every surgeon profile that has reached at least one milestone.
async function giftQueue() {
  const [counts, refs, profiles] = await Promise.all([
    sd.countsBySurgeon(),
    sd.refs(),
    Surgeon.find({}, { surgeonName: 1, alignedHospital: 1 }).lean(),
  ]);
  const db = store.load();
  const accounts = new Map(db.users.filter((u) => u.surgeonId && u.status !== 'disabled').map((u) => [u.surgeonId, u.email]));
  const giftsBySurgeon = new Map();
  for (const g of db.rewards) {
    if (!giftsBySurgeon.has(g.surgeonId)) giftsBySurgeon.set(g.surgeonId, []);
    giftsBySurgeon.get(g.surgeonId).push(g);
  }

  const surgeons = [];
  for (const p of profiles) {
    const id = String(p._id);
    const caseCount = counts.get(id) || 0;
    const reached = reachedFor(caseCount);
    if (!reached.length) continue;
    const gifts = giftsBySurgeon.get(id) || [];
    surgeons.push({
      surgeonId: id,
      surgeonName: p.surgeonName || 'Unnamed surgeon',
      hospitalName: p.alignedHospital ? refs.hospitals.get(String(p.alignedHospital)) || null : null,
      caseCount,
      account: accounts.get(id) || null,
      milestones: reached.map((m) => milestoneView(m, gifts.find((g) => g.tier === m.tier))).reverse(),
    });
  }
  surgeons.sort((a, b) => b.caseCount - a.caseCount || a.surgeonName.localeCompare(b.surgeonName));
  const statusCounts = { preparing: 0, dispatched: 0, delivered: 0, closed: 0 };
  for (const s of surgeons) for (const m of s.milestones) statusCounts[m.status] += 1;
  return { milestones: MILESTONES, surgeons, counts: statusCounts };
}

class GiftError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Admin action on one surgeon's milestone gift. Throws GiftError on bad input.
async function updateGift({ surgeonId, tier, status, gift, adminNote, admin }) {
  const m = milestoneOf(tier);
  if (!m) throw new GiftError(400, 'Unknown milestone');
  if (!sd.isId(surgeonId)) throw new GiftError(400, 'Invalid surgeon id');
  const profile = await Surgeon.findById(surgeonId, { surgeonName: 1 }).lean();
  if (!profile) throw new GiftError(404, 'Surgeon not found');
  const caseCount = await countSurgeries(surgeonId);
  if (caseCount < m.at) throw new GiftError(400, `${profile.surgeonName} has not reached ${m.at} surgeries yet`);

  const giftText = String(gift ?? '').replace(/\s+/g, ' ').trim();
  const note = String(adminNote ?? '').trim();
  if (giftText.length > 300) throw new GiftError(400, 'Gift details must be 300 characters or fewer');
  if (note.length > 500) throw new GiftError(400, 'Note must be 500 characters or fewer');

  // no await below this line: check-then-write cannot interleave
  const db = store.load();
  let record = db.rewards.find((g) => g.surgeonId === String(surgeonId) && g.tier === m.tier);
  const from = record?.status || 'preparing';
  if (!TRANSITIONS[from]?.includes(status)) {
    throw new GiftError(409, `A ${from} gift cannot be marked ${status}`);
  }
  if (status === 'dispatched' && !giftText) throw new GiftError(400, 'Please describe the gift you are sending');
  if (status === 'closed' && !note) throw new GiftError(400, 'Please give a reason for closing this milestone');

  const now = store.now();
  if (!record) {
    record = { id: store.newId(), surgeonId: String(surgeonId), tier: m.tier, milestone: m.at, createdAt: now };
    db.rewards.push(record);
  }
  Object.assign(record, {
    surgeonName: profile.surgeonName,
    status,
    caseCountAtUpdate: caseCount,
    updatedAt: now,
    handledBy: admin,
  });
  if (giftText) record.gift = giftText;
  if (note || status === 'closed') record.adminNote = note;
  if (status === 'dispatched' && from !== 'dispatched') record.dispatchedAt = now;
  if (status === 'delivered') record.deliveredAt = now;
  await store.persist();
  return { surgeonId: record.surgeonId, surgeonName: record.surgeonName, ...milestoneView(m, record) };
}

async function pendingGiftCount() {
  return (await giftQueue()).counts.preparing;
}

module.exports = { MILESTONES, TRANSITIONS, rewardState, giftQueue, updateGift, pendingGiftCount, GiftError };
