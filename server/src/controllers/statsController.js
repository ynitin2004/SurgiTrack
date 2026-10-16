const Surgeon = require('../models/Surgeon');
const sd = require('../services/surgeryData');

const { F, DAY } = sd;

const inRange = (from, to) => ({
  $sum: { $cond: [{ $and: [{ $gte: [`$${F.date}`, from] }, { $lt: [`$${F.date}`, to] }] }, 1, 0] },
});

// Single source of truth for the dashboard summary — used by GET /api/stats/summary
// and re-emitted over Socket.IO ("stats:update") when a change stream fires.
async function computeSummary() {
  const today = sd.dayStartUtc();
  const tomorrow = new Date(today.getTime() + DAY);
  const weekStart = new Date(today.getTime() - 6 * DAY);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const validDate = { [F.date]: { $gte: sd.MIN_VALID_DATE, $lt: tomorrow } };

  const [[result], r] = await Promise.all([
    sd
      .coll()
      .aggregate([
        {
          $facet: {
            counts: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  today: inRange(today, tomorrow),
                  thisWeek: inRange(weekStart, tomorrow),
                  thisMonth: inRange(monthStart, tomorrow),
                  latest: {
                    $max: {
                      $cond: [
                        { $and: [{ $gte: [`$${F.date}`, sd.MIN_VALID_DATE] }, { $lt: [`$${F.date}`, tomorrow] }] },
                        `$${F.date}`,
                        null,
                      ],
                    },
                  },
                },
              },
            ],
            // parsed in JS (formats vary: "02:51:24", "2h 42min", "6h 10m")
            durations: [
              { $match: { [F.duration]: { $type: 'string' } } },
              { $group: { _id: null, d: { $push: `$${F.duration}` } } },
            ],
            hospitals: [{ $match: { [F.hospital]: { $ne: null } } }, { $group: { _id: `$${F.hospital}` } }],
            monthlyTrend: [
              { $match: validDate },
              { $group: { _id: { y: { $year: `$${F.date}` }, m: { $month: `$${F.date}` } }, count: { $sum: 1 } } },
              { $sort: { '_id.y': -1, '_id.m': -1 } },
              { $limit: 12 },
            ],
            byCategory: [{ $group: { _id: sd.CATEGORY_KEY, count: { $sum: 1 } } }],
            topSurgeons: [
              { $match: { [F.surgeon]: { $type: 'objectId' } } },
              { $group: { _id: `$${F.surgeon}`, count: { $sum: 1 } } },
              { $sort: { count: -1, _id: 1 } },
              // ids that don't resolve to a surgeon_info profile are dropped below
              { $limit: 40 },
            ],
            recent: [
              { $match: validDate },
              { $sort: { [F.date]: -1, _id: -1 } },
              { $limit: 10 },
              { $project: sd.ROW_PROJECTION },
            ],
          },
        },
      ])
      .toArray(),
    sd.refs(),
  ]);

  const c = result.counts[0] || {};
  const durations = (result.durations[0]?.d || []).map(sd.parseDurationMs).filter((x) => x != null);
  const avgMs = durations.length ? durations.reduce((s, x) => s + x, 0) / durations.length : null;

  const [totalSurgeons, byCategory, recentSurgeries] = await Promise.all([
    Surgeon.estimatedDocumentCount(),
    sd.categoryCounts(result.byCategory),
    sd.toRows(result.recent),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      surgeries: c.total || 0,
      surgeriesToday: c.today || 0,
      surgeriesThisWeek: c.thisWeek || 0,
      surgeriesThisMonth: c.thisMonth || 0,
      surgeons: totalSurgeons,
      hospitals: result.hospitals.filter((h) => r.hospitals.has(String(h._id))).length,
      avgSurgeryDurationMin: avgMs ? Math.round(avgMs / 60000) : null,
      latestSurgeryDate: c.latest ? new Date(c.latest).toISOString() : null,
    },
    // most recent 12 months that actually have data, oldest first
    monthlyTrend: result.monthlyTrend
      .map((m) => ({ month: `${m._id.y}-${String(m._id.m).padStart(2, '0')}`, count: m.count }))
      .reverse(),
    byCategory,
    topSurgeons: result.topSurgeons
      .filter((s) => r.surgeons.get(String(s._id)))
      .slice(0, 10)
      .map((s) => ({ name: r.surgeons.get(String(s._id)), surgeonId: String(s._id), count: s.count })),
    recentSurgeries,
  };
}

async function summary(req, res) {
  res.json(await computeSummary());
}

module.exports = { summary, computeSummary };
