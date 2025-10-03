const mongoose = require('mongoose');

const tutorDocumentSchema = new mongoose.Schema({
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: true
  },
  document_type: {
    type: String,
    enum: ['ID Proof', 'Address Proof', 'Degree', 'Certificate', 'Reference Letter', 'Background Check'],
    required: true
  },
  file_url: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  },
  verification_status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  notes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('TutorDocument', tutorDocumentSchema);
