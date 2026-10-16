const mongoose = require('mongoose');

// Read-only view over the existing surgeon_info collection.
// strict:false — the collection belongs to another app; we only read it.
const surgeonSchema = new mongoose.Schema(
  {
    surgeonName: String,
    areaOfExpertise: String,
    alignedHospital: mongoose.Schema.Types.ObjectId,
    hospitalAlignedDate: Date,
    hospitalHistory: Array,
  },
  { strict: false, collection: 'surgeon_info' }
);

module.exports = mongoose.model('Surgeon', surgeonSchema);
