// Surgeon trophy tiers by total surgeries (keep in sync with
// server/src/services/rewards.js). Each tier from Bronze up is a milestone that
// unlocks a trophy badge and a customised gift from the SSI team:
//   0–49 Beginner (no badge) · 50 Bronze · 100 Silver · 200 Gold · 500 Champion · 1000 Legend
export const TIERS = [
  { key: 'beginner', label: 'Beginner', min: 0 },
  { key: 'bronze', label: 'Bronze', min: 50 },
  { key: 'silver', label: 'Silver', min: 100 },
  { key: 'gold', label: 'Gold', min: 200 },
  { key: 'champion', label: 'Champion', min: 500 },
  { key: 'legend', label: 'Legend', min: 1000 },
];

export const MILESTONE_TIERS = TIERS.slice(1);

export function tierFor(count) {
  const n = Math.max(0, Number(count) || 0);
  let i = 0;
  while (i + 1 < TIERS.length && n >= TIERS[i + 1].min) i++;
  const next = TIERS[i + 1] || null;
  return {
    ...TIERS[i],
    beginner: i === 0,
    next,
    toNext: next ? next.min - n : 0,
    // share of the way from this tier's start to the next milestone (0..1)
    progress: next ? (n - TIERS[i].min) / (next.min - TIERS[i].min) : 1,
  };
}
