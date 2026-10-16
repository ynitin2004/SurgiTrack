const mongoose = require('mongoose');

// Read-only view over the existing hospitals collection (for surgeon profiles).
const hospitalSchema = new mongoose.Schema(
  {
    hospitalName: String,
    hospitalAddress: String,
  },
  { strict: false, collection: 'hospitals' }
);

module.exports = mongoose.model('Hospital', hospitalSchema);
