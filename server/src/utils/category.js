// procedure_category is stored inconsistently ("General Surgery", "General surgery",
// "general_surgery", "Gastrointestinal  Surgery"...). Normalize to snake_case keys.
function normCategory(raw) {
  if (raw == null || String(raw).trim() === '') return 'unknown';
  return String(raw).trim().toLowerCase().replace(/[\s_-]+/g, '_');
}

// Merge [{ category: raw, count }] rows that normalize to the same key.
function mergeCategoryCounts(rows) {
  const map = new Map();
  for (const { category, count } of rows) {
    const key = normCategory(category);
    map.set(key, (map.get(key) || 0) + count);
  }
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { normCategory, mergeCategoryCounts };
