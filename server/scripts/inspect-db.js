// One-off discovery: lists databases/collections, samples the two known
// collections, and checks change-stream support. Run: npm run inspect-db
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

const TARGET_COLLECTIONS = ['surgeon_info', 'surgeries_complete_list'];

function fieldTypes(doc, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null) out[key] = 'null';
    else if (Array.isArray(v)) out[key] = `array(${v.length})`;
    else if (v instanceof Date) out[key] = 'Date';
    else if (typeof v === 'object' && v._bsontype === 'ObjectId') out[key] = 'ObjectId';
    else if (typeof v === 'object') Object.assign(out, fieldTypes(v, key));
    else out[key] = typeof v;
  }
  return out;
}

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const { databases } = await client.db().admin().listDatabases();
  console.log('=== DATABASES ===');
  for (const d of databases) console.log(` - ${d.name} (${d.sizeOnDisk} bytes)`);

  for (const dbInfo of databases) {
    if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
    const db = client.db(dbInfo.name);
    const cols = await db.listCollections().toArray();
    console.log(`\n=== DB: ${dbInfo.name} ===`);
    for (const c of cols) {
      const count = await db.collection(c.name).countDocuments();
      console.log(` collection: ${c.name}  docs: ${count}`);
    }
    for (const name of TARGET_COLLECTIONS) {
      if (!cols.find((c) => c.name === name)) continue;
      const samples = await db.collection(name).find().limit(3).toArray();
      console.log(`\n--- samples: ${dbInfo.name}.${name} ---`);
      for (const s of samples) console.log(JSON.stringify(s, null, 1));
      if (samples[0]) {
        console.log(`--- field types: ${name} ---`);
        console.log(JSON.stringify(fieldTypes(samples[0]), null, 1));
      }
    }
  }

  // change-stream support check
  try {
    const cs = client.db('test').collection('__cs_probe').watch();
    await new Promise((res, rej) => {
      cs.once('resumeTokenChanged', res);
      cs.once('error', rej);
      setTimeout(res, 3000);
    });
    await cs.close();
    console.log('\nCHANGE STREAMS: supported');
  } catch (e) {
    console.log('\nCHANGE STREAMS: NOT supported ->', e.message);
  }

  await client.close();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
