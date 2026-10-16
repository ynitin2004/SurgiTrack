// Surgeon tier by total surgeries. Lower bound inclusive:
//   0–19 Bronze · 20–49 Silver · 50–99 Gold · 100–499 Champion · 500+ Legend
export const TIERS = [
  { key: 'bronze', label: 'Bronze', min: 0 },
  { key: 'silver', label: 'Silver', min: 20 },
  { key: 'gold', label: 'Gold', min: 50 },
  { key: 'champion', label: 'Champion', min: 100 },
  { key: 'legend', label: 'Legend', min: 500 },
];

export function tierFor(count) {
  const n = Math.max(0, Number(count) || 0);
  let i = 0;
  while (i + 1 < TIERS.length && n >= TIERS[i + 1].min) i++;
  const next = TIERS[i + 1] || null;
  return { ...TIERS[i], next, toNext: next ? next.min - n : 0 };
}
