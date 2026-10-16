const mongoose = require('mongoose');

// The database belongs to another application and is strictly READ-ONLY for
// this dashboard: never let mongoose create collections or indexes.
async function connectDB() {
  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', false);
  mongoose.set('autoCreate', false);
  // log which hosts we try (never the credentials) so hosted logs show progress
  const hosts = String(process.env.MONGODB_URI).replace(/^mongodb(\+srv)?:\/\/([^@]*@)?/, '').split(/[/?]/)[0];
  console.log(`connecting to MongoDB at ${hosts} …`);
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'sutra_dev',
    readPreference: 'secondaryPreferred',
    serverSelectionTimeoutMS: 20000,
  });
  console.log(`MongoDB connected (db: ${mongoose.connection.name}, read-only usage)`);
  return mongoose.connection;
}

module.exports = connectDB;
