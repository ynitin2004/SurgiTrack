const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// App-owned data (dashboard users, reward requests). The MongoDB `sutra_dev`
// database is READ-ONLY for this app, so this lives in a JSON file instead.
// All reads/mutations are synchronous on the in-memory copy, so a
// check-then-insert sequence with no `await` in between is race-free.
const FILE = process.env.APP_STORE_FILE || path.join(__dirname, '..', '..', 'data', 'app-store.json');

let data = null;
let writeChain = Promise.resolve();

function load() {
  if (data) return data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Cannot read app store ${FILE}: ${err.message}`);
    data = {};
  }
  data.users ||= [];
  data.redemptions ||= []; // legacy free-instrument requests (no longer used)
  data.rewards ||= []; // milestone gifts sent by admins (services/rewards.js)
  return data;
}

async function writeFileSafely(contents) {
  await fs.promises.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.promises.writeFile(tmp, contents);
  // OneDrive/antivirus can briefly lock the target on Windows — retry the swap.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.promises.rename(tmp, FILE);
      return;
    } catch (err) {
      if (attempt >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        await fs.promises.writeFile(FILE, contents);
        await fs.promises.rm(tmp, { force: true });
        return;
      }
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}

function persist() {
  const snapshot = JSON.stringify(data, null, 2);
  writeChain = writeChain
    .then(() => writeFileSafely(snapshot))
    .catch((err) => console.error('app store write failed:', err.message));
  return writeChain;
}

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

module.exports = { load, persist, newId, now, FILE };
