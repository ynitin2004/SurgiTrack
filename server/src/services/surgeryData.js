const mongoose = require('mongoose');
const { normCategory } = require('../utils/category');

// Surgery records live in `surgeries_timesheets` (the collection the surgery
// app writes to today; `surgeries_complete_list` stopped receiving data in
// Nov 2025). Docs reference other collections by ObjectId, so names are
// resolved here and every API response is mapped to one flat "row" shape the
// UI understands. READ-ONLY: only find/aggregate/distinct are ever used.
const COLLECTION = 'surgeries_timesheets';
const DELETED_COLLECTION = 'surgeries_timesheets_delete';

const F = {
  date: 'hospitalInfo.surgeryDate', // Date, UTC midnight of the local surgery day
  surgeon: 'hospitalInfo.surgeonId', // ObjectId -> surgeon_info (can be null/missing)
  hospital: 'hospitalInfo.hospitalId', // ObjectId -> hospitals
  procedure: 'hospitalInfo.procedureTypeId', // ObjectId -> procedure_types
  category: 'hospitalInfo.procedureCategoryId', // ObjectId (rarely a string) -> master_procedure_categories
  system: 'hospitalInfo.systemId', // ObjectId -> system_detail
  instruments: 'surgeryInstrumentsInfo.instrumentsUsed', // [{ instrumentName }]
  duration: 'surgeryInstrumentsInfo.surgery.duration', // "02:51:24" | "2h 42min" | "6h 10m" | junk
};

// A few records carry typo years (0026, 0206) — they still count as surgeries,
// but are left out of date-based figures and "recent" lists.
const MIN_VALID_DATE = new Date(Date.UTC(2015, 0, 1));
const DAY = 86400000;

const coll = (name = COLLECTION) => mongoose.connection.db.collection(name);
const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v ?? ''));
const toObjectId = (v) => new mongoose.Types.ObjectId(String(v));
const idKey = (v) => (v == null ? null : String(v));

// Surgery dates are stored as UTC midnight of the calendar day, so "today" is
// the server's local calendar day expressed the same way.
function dayStartUtc(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
const tomorrowUtc = () => new Date(dayStartUtc().getTime() + DAY);
const validDateMatch = () => ({ [F.date]: { $gte: MIN_VALID_DATE, $lt: tomorrowUtc() } });

// surgeonId is an ObjectId, but match the string form too in case the
// writing app ever stores it that way.
const surgeonMatch = (id) => ({ [F.surgeon]: { $in: [toObjectId(id), String(id)] } });

// "02:51:24" / "2:51" / "2h 42min" / "6h 10m" / "45 min" -> ms. Values outside
// 1 min – 24 h (e.g. "145:35:00") are data-entry errors and return null.
function parseDurationMs(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  let mins = null;
  let m = s.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) mins = Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0);
  else if ((m = s.match(/^(?:(\d{1,3})\s*h(?:rs?|ours?)?)?\s*(?:(\d{1,4})\s*m(?:in(?:ute)?s?)?)?$/i)) && (m[1] || m[2])) {
    mins = Number(m[1] || 0) * 60 + Number(m[2] || 0);
  }
  if (mins == null || mins < 1 || mins > 24 * 60) return null;
  return Math.round(mins * 60000);
}

// ---- reference data (small collections, cached in memory) -----------------

const REF_TTL = 5 * 60 * 1000;
let refCache = { at: 0, promise: null };

async function loadRefs() {
  const db = mongoose.connection.db;
  const [hospitals, procedures, categories, systems, surgeons] = await Promise.all([
    db.collection('hospitals').find({}, { projection: { hospitalName: 1, hospitalAddress: 1 } }).toArray(),
    db.collection('procedure_types').find({}, { projection: { procedureName: 1, procedureCode: 1, procedureCategoryId: 1 } }).toArray(),
    db.collection('master_procedure_categories').find({}, { projection: { categoryLabel: 1, categoryValue: 1 } }).toArray(),
    db.collection('system_detail').find({}, { projection: { systemNumber: 1 } }).toArray(),
    db.collection('surgeon_info').find({}, { projection: { surgeonName: 1 } }).toArray(),
  ]);

  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  // Several hospitals share a name ("Manipal Hospital" x4), so add the short
  // address/city to tell them apart.
  const hospitalLabel = (h) => {
    const name = clean(h.hospitalName);
    const addr = clean(h.hospitalAddress);
    if (!name) return null;
    return addr && addr.length <= 40 && !name.toLowerCase().includes(addr.toLowerCase()) ? `${name}, ${addr}` : name;
  };

  return {
    hospitals: new Map(hospitals.map((h) => [String(h._id), hospitalLabel(h)]).filter(([, l]) => l)),
    procedures: new Map(
      procedures.map((p) => [
        String(p._id),
        { name: clean(p.procedureName) || null, code: clean(p.procedureCode) || null, categoryId: idKey(p.procedureCategoryId) },
      ])
    ),
    categories: new Map(categories.map((c) => [String(c._id), normCategory(c.categoryLabel || c.categoryValue)])),
    systems: new Map(systems.map((s) => [String(s._id), clean(s.systemNumber) || null])),
    surgeons: new Map(surgeons.map((s) => [String(s._id), clean(s.surgeonName) || null])),
  };
}

function refs() {
  if (refCache.promise && Date.now() - refCache.at < REF_TTL) return refCache.promise;
  refCache = { at: Date.now(), promise: loadRefs() };
  refCache.promise.catch(() => (refCache = { at: 0, promise: null }));
  return refCache.promise;
}

// called by the change streams when surgeon_info changes
function invalidateRefs() {
  refCache = { at: 0, promise: null };
}

// procedureCategoryId wins; fall back to the procedure type's own category.
function categoryOf(doc, r) {
  const info = doc.hospitalInfo || {};
  const direct = r.categories.get(idKey(info.procedureCategoryId));
  if (direct) return direct;
  const proc = r.procedures.get(idKey(info.procedureTypeId));
  return (proc && r.categories.get(proc.categoryId)) || 'unknown';
}

// Projection for the fields toRow() needs (never patient data).
const ROW_PROJECTION = {
  [F.date]: 1,
  [F.surgeon]: 1,
  [F.hospital]: 1,
  [F.procedure]: 1,
  [F.category]: 1,
  [F.system]: 1,
  [F.duration]: 1,
};

// Flat row shape used by every surgery table in the UI.
function toRow(doc, r) {
  const info = doc.hospitalInfo || {};
  const sid = idKey(info.surgeonId);
  const proc = r.procedures.get(idKey(info.procedureTypeId));
  const date = info.surgeryDate instanceof Date ? info.surgeryDate.getTime() : null;
  return {
    _id: doc._id,
    date_of_surgery: date != null && date >= MIN_VALID_DATE.getTime() ? date : null,
    surgeon_name: sid ? [{ label: r.surgeons.get(sid) || 'Unknown', value: sid }] : [],
    hospital_name: r.hospitals.get(idKey(info.hospitalId)) || null,
    procedure_name: proc?.name || null,
    procedure_code: proc?.code || null,
    procedure_category: categoryOf(doc, r),
    system_no: r.systems.get(idKey(info.systemId)) || null,
    surgery: { duration: parseDurationMs(doc.surgeryInstrumentsInfo?.surgery?.duration) },
  };
}

async function toRows(docs) {
  const r = await refs();
  return docs.map((d) => toRow(d, r));
}

// [{ _id: <categoryId string|null>, count }] -> [{ category, count }] merged by
// normalized key, biggest first.
async function categoryCounts(groupRows) {
  const r = await refs();
  const map = new Map();
  for (const g of groupRows) {
    const key = r.categories.get(idKey(g._id)) || 'unknown';
    map.set(key, (map.get(key) || 0) + g.count);
  }
  return [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

// group stage key for category ids that may be ObjectId or string
const CATEGORY_KEY = { $convert: { input: `$${F.category}`, to: 'string', onError: null, onNull: null } };

module.exports = {
  COLLECTION,
  DELETED_COLLECTION,
  F,
  MIN_VALID_DATE,
  DAY,
  coll,
  isId,
  toObjectId,
  idKey,
  dayStartUtc,
  tomorrowUtc,
  validDateMatch,
  surgeonMatch,
  parseDurationMs,
  refs,
  invalidateRefs,
  ROW_PROJECTION,
  toRows,
  categoryCounts,
  CATEGORY_KEY,
};
