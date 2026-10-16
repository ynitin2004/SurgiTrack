const store = require('../store/store');
const sd = require('./surgeryData');
const { countSurgeries, INSTRUMENT_STAGES } = require('./surgeonProfile');

// Every REWARD_EVERY_CASES completed surgeries (50, 100, 150, …) unlocks one
// free instrument. Each milestone can be redeemed once; a rejected request
// frees the milestone so the surgeon can request again.
const EVERY = Math.max(1, Number(process.env.REWARD_EVERY_CASES) || 50);

const ACTIVE = ['requested', 'approved', 'fulfilled'];
const TRANSITIONS = {
  requested: ['approved', 'rejected'],
  approved: ['fulfilled', 'rejected'],
  fulfilled: [],
  rejected: [],
};

function redemptionsFor(surgeonId) {
  return store.load().redemptions.filter((r) => r.surgeonId === surgeonId);
}

function activeRedemption(surgeonId, milestone) {
  return redemptionsFor(surgeonId).find((r) => r.milestone === milestone && ACTIVE.includes(r.status)) || null;
}

async function rewardState(surgeonId) {
  const caseCount = await countSurgeries(surgeonId);
  const earned = Math.floor(caseCount / EVERY);
  const mine = redemptionsFor(surgeonId);

  const milestones = [];
  for (let m = earned; m >= 1; m--) {
    const milestone = m * EVERY;
    const active = mine.find((r) => r.milestone === milestone && ACTIVE.includes(r.status));
    const lastRejected = mine
      .filter((r) => r.milestone === milestone && r.status === 'rejected')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    milestones.push({
      milestone,
      status: active ? active.status : 'available',
      redemption: active || null,
      lastRejection: !active && lastRejected ? { adminNote: lastRejected.adminNote, at: lastRejected.updatedAt } : null,
    });
  }

  return {
    every: EVERY,
    caseCount,
    earned,
    available: milestones.filter((m) => m.status === 'available').length,
    nextMilestone: (earned + 1) * EVERY,
    casesToNext: (earned + 1) * EVERY - caseCount,
    milestones,
    history: mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

// Distinct instrument names seen in surgery records, cleaned — the catalog a
// surgeon can choose their free instrument from. Cached for 10 minutes.
let catalog = { at: 0, items: [] };
async function instrumentCatalog() {
  if (Date.now() - catalog.at < 10 * 60 * 1000 && catalog.items.length) return catalog.items;
  // same name cleaning as the per-surgeon instrument chart
  const rows = await sd.coll().aggregate(INSTRUMENT_STAGES).toArray();
  const items = rows.map((r) => r.name.replace(/\s+/g, ' ').trim()).filter(Boolean);
  catalog = {
    at: Date.now(),
    items,
  };
  return catalog.items;
}

module.exports = { EVERY, TRANSITIONS, rewardState, activeRedemption, instrumentCatalog };
