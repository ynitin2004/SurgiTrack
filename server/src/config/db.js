const mongoose = require('mongoose');

// The database belongs to another application and is strictly READ-ONLY for
// this dashboard: never let mongoose create collections or indexes.
async function connectDB() {
  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', false);
  mongoose.set('autoCreate', false);
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'sutra_dev',
    readPreference: 'secondaryPreferred',
  });
  console.log(`MongoDB connected (db: ${mongoose.connection.name}, read-only usage)`);
  return mongoose.connection;
}

module.exports = connectDB;
