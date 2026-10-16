const mongoose = require('mongoose');
const Surgeon = require('../models/Surgeon');
const sd = require('./surgeryData');
const { cleanExpertise, INSTRUMENT_STAGES, topProcedures } = require('./surgeonProfile');

// Export reports (PowerPoint / Excel) for one surgeon over a period:
//   period=month   value=YYYY-MM     (one calendar month)
//   period=quarter value=YYYY-Qn     (one calendar quarter)
//   period=all                        (every recorded surgery)
// Dates are stored as UTC midnight of the surgery day, so ranges are UTC.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CASES_LIMIT = 2000;

class BadPeriod extends Error {
  constructor(msg) {
    super(msg);
    this.status = 400;
  }
}

// -> { type, value, label, from: Date|null, to: Date|null }
function parsePeriod(type = 'all', value) {
  if (type === 'all') return { type, value: null, label: 'All surgeries', from: null, to: null };
  if (type === 'month') {
    const m = /^(\d{4})-(\d{2})$/.exec(value || '');
    if (!m || +m[2] < 1 || +m[2] > 12) throw new BadPeriod('Month must look like 2026-09');
    const y = +m[1];
    const mo = +m[2] - 1;
    return { type, value, label: `${MONTHS[mo]} ${y}`, from: new Date(Date.UTC(y, mo, 1)), to: new Date(Date.UTC(y, mo + 1, 1)) };
  }
  if (type === 'quarter') {
    const m = /^(\d{4})-Q([1-4])$/.exec(value || '');
    if (!m) throw new BadPeriod('Quarter must look like 2026-Q3');
    const y = +m[1];
    const q = +m[2];
    const mo = (q - 1) * 3;
    return {
      type,
      value,
      label: `Q${q} ${y} (${MONTHS[mo]}–${MONTHS[mo + 2]})`,
      from: new Date(Date.UTC(y, mo, 1)),
      to: new Date(Date.UTC(y, mo + 3, 1)),
    };
  }
  throw new BadPeriod('Period must be month, quarter or all');
}

const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

// months and quarters that have at least one dated surgery, newest first
async function reportPeriods(id) {
  const rows = await sd
    .coll()
    .aggregate([
      { $match: { ...sd.surgeonMatch(id), ...sd.validDateMatch() } },
      { $group: { _id: { y: { $year: `$${sd.F.date}` }, m: { $month: `$${sd.F.date}` } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': -1, '_id.m': -1 } },
    ])
    .toArray();
  const quarters = new Map();
  for (const r of rows) {
    const key = `${r._id.y}-Q${Math.ceil(r._id.m / 3)}`;
    quarters.set(key, (quarters.get(key) || 0) + r.count);
  }
  return {
    months: rows.map((r) => ({ value: monthKey(r._id.y, r._id.m), label: parsePeriod('month', monthKey(r._id.y, r._id.m)).label, count: r.count })),
    quarters: [...quarters.entries()].map(([value, count]) => ({ value, label: parsePeriod('quarter', value).label, count })),
  };
}

async function buildSurgeonReport(id, periodType, periodValue) {
  const period = parsePeriod(periodType, periodValue);
  const surgeon = await Surgeon.findById(id).lean();
  if (!surgeon) return null;

  const dateMatch = period.from
    ? { [sd.F.date]: { $gte: period.from, $lt: period.to } }
    : {}; // "all" keeps undated / typo-dated cases too
  const match = { ...sd.surgeonMatch(id), ...dateMatch };

  const [hospital, caseDocs, [f], instruments, allTimeCount, r] = await Promise.all([
    surgeon.alignedHospital
      ? mongoose.connection.db.collection('hospitals').findOne({ _id: surgeon.alignedHospital }, { projection: { hospitalName: 1 } })
      : null,
    sd
      .coll()
      .find(match, { projection: sd.ROW_PROJECTION })
      .sort({ [sd.F.date]: -1, _id: -1 })
      .limit(CASES_LIMIT)
      .toArray(),
    sd
      .coll()
      .aggregate([
        { $match: match },
        {
          $facet: {
            total: [{ $count: 'n' }],
            byCategory: [{ $group: { _id: sd.CATEGORY_KEY, count: { $sum: 1 } } }],
            byProcedure: [{ $group: { _id: `$${sd.F.procedure}`, count: { $sum: 1 } } }],
            hospitals: [
              { $match: { [sd.F.hospital]: { $ne: null } } },
              { $group: { _id: `$${sd.F.hospital}`, count: { $sum: 1 }, first: { $min: `$${sd.F.date}` }, last: { $max: `$${sd.F.date}` } } },
              { $sort: { count: -1 } },
            ],
            trend: [
              { $match: sd.validDateMatch() },
              { $group: { _id: { y: { $year: `$${sd.F.date}` }, m: { $month: `$${sd.F.date}` } }, count: { $sum: 1 } } },
              { $sort: { '_id.y': 1, '_id.m': 1 } },
            ],
          },
        },
      ])
      .toArray(),
    sd.coll().aggregate([{ $match: match }, ...INSTRUMENT_STAGES]).toArray(),
    sd.coll().countDocuments(sd.surgeonMatch(id)),
    sd.refs(),
  ]);

  const cases = await sd.toRows(caseDocs);
  const validTs = (d) => (d instanceof Date && d >= sd.MIN_VALID_DATE ? d.getTime() : null);
  const procedures = topProcedures(f.byProcedure, r, Infinity);
  const durations = cases.map((c) => c.surgery.duration).filter((d) => d != null);
  const dated = cases.map((c) => c.date_of_surgery).filter((d) => d != null);

  // every month of the period, zero-filled, so the trend chart has no gaps
  const counts = new Map(f.trend.map((t) => [monthKey(t._id.y, t._id.m), t.count]));
  const trend = [];
  const start = period.from || (f.trend[0] && new Date(Date.UTC(f.trend[0]._id.y, f.trend[0]._id.m - 1, 1)));
  const end = period.to || (f.trend.length && new Date(Date.UTC(f.trend.at(-1)._id.y, f.trend.at(-1)._id.m, 1)));
  if (start && end) {
    for (let d = new Date(start); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
      const key = monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
      trend.push({ month: key, count: counts.get(key) || 0 });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    period: { type: period.type, value: period.value, label: period.label, from: period.from?.getTime() ?? null, to: period.to ? period.to.getTime() - sd.DAY : null }, // last day, UTC midnight like surgery dates
    surgeon: {
      _id: surgeon._id,
      surgeonName: surgeon.surgeonName,
      areaOfExpertise: cleanExpertise(surgeon.areaOfExpertise),
      hospitalName: hospital?.hospitalName || null,
    },
    allTimeSurgeryCount: allTimeCount, // tier is always based on the career total
    surgeryCount: f.total[0]?.n || 0,
    distinctProcedures: procedures.distinct,
    procedures: procedures.top,
    byCategory: await sd.categoryCounts(f.byCategory),
    instruments: instruments.slice(0, 10).map((x) => ({ name: x.name.replace(/\s+/g, ' '), count: x.count })),
    distinctInstruments: instruments.length,
    hospitalsServedList: f.hospitals
      .filter((h) => r.hospitals.has(String(h._id)))
      .map((h) => ({ name: r.hospitals.get(String(h._id)), count: h.count, first: validTs(h.first), last: validTs(h.last) })),
    unlistedHospitalCases: f.hospitals.filter((h) => !r.hospitals.has(String(h._id))).reduce((n, h) => n + h.count, 0),
    avgDurationMin: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000) : null,
    firstSurgeryDate: dated.length ? Math.min(...dated) : null,
    lastSurgeryDate: dated.length ? Math.max(...dated) : null,
    trend,
    cases,
    casesTruncated: (f.total[0]?.n || 0) > cases.length,
  };
}

module.exports = { parsePeriod, reportPeriods, buildSurgeonReport, BadPeriod };
