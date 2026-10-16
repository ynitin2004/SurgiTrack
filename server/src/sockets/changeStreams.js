const mongoose = require('mongoose');
const { computeSummary } = require('../controllers/statsController');
const notify = require('./notify');
const sd = require('../services/surgeryData');

// Event contract (frontend depends on these names):
//   to admins:
//     surgery:change  { operationType, doc }  a surgery was inserted/updated/deleted
//     surgeon:change  { operationType, doc }  a surgeon was inserted/updated/deleted
//     stats:update    <summary payload>       recomputed dashboard summary (debounced)
//   to the surgeon whose case changed (room surgeon:<id>):
//     my:surgery-change { operationType }     their portal + reward progress refetch
//   surgeries_timesheets_delete only tells the surgeon of a deleted case (the
//   delete itself already reaches admins through surgeries_timesheets).
const WATCHED = [
  { collection: sd.COLLECTION, event: 'surgery:change' },
  { collection: sd.DELETED_COLLECTION, event: null },
  { collection: 'surgeon_info', event: 'surgeon:change' },
];

// surgeon id referenced by a surgery doc (ObjectId, occasionally null)
function surgeonIdsOf(doc) {
  const id = sd.idKey(doc?.hospitalInfo?.surgeonId);
  return id && sd.isId(id) ? [id] : [];
}

function initChangeStreams() {
  let statsTimer = null;
  const emitStatsDebounced = () => {
    if (statsTimer) return;
    statsTimer = setTimeout(async () => {
      statsTimer = null;
      try {
        notify.admins('stats:update', await computeSummary());
      } catch (err) {
        console.error('stats recompute failed:', err.message);
      }
    }, 2000);
  };

  for (const { collection, event } of WATCHED) {
    watchCollection(collection, event, emitStatsDebounced);
  }
}

function watchCollection(collection, event, onAnyChange, resumeToken = null) {
  const coll = mongoose.connection.db.collection(collection);
  const stream = coll.watch([], {
    fullDocument: 'updateLookup',
    ...(resumeToken ? { resumeAfter: resumeToken } : {}),
  });
  let lastToken = resumeToken;

  stream.on('change', (change) => {
    lastToken = change._id;
    const doc = change.fullDocument || { _id: change.documentKey?._id };
    if (collection === 'surgeon_info') sd.invalidateRefs(); // names shown in surgery rows
    if (collection === sd.COLLECTION || collection === sd.DELETED_COLLECTION) {
      for (const id of surgeonIdsOf(change.fullDocument)) {
        notify.surgeon(id, 'my:surgery-change', { operationType: change.operationType });
      }
    }
    if (!event) return;
    notify.admins(event, { operationType: change.operationType, doc: publicDoc(collection, doc) });
    onAnyChange();
  });

  stream.on('error', (err) => {
    console.error(`change stream error (${collection}):`, err.message);
    stream.close().catch(() => {});
    // retry with the last resume token so no events are lost
    setTimeout(() => watchCollection(collection, event, onAnyChange, lastToken), 5000);
  });

  console.log(`watching ${collection} -> "${event || 'my:surgery-change'}"`);
}

// surgery docs carry patient details — only send ids to the browser
function publicDoc(collection, doc) {
  return collection === sd.COLLECTION ? { _id: doc._id } : doc;
}

module.exports = { initChangeStreams };
