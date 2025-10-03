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
  // Legacy field for backward compatibility
  file_url: {
    type: String,
    required: false // Made optional for new base64 approach
  },
  // New fields for Vercel-compatible storage
  fileName: {
    type: String,
    required: false
  },
  originalName: {
    type: String,
    required: false
  },
  mimetype: {
    type: String,
    required: false
  },
  size: {
    type: Number,
    required: false
  },
  base64Data: {
    type: String,
    required: false // Store base64 encoded file
  },
  fileType: {
    type: String,
    enum: ['image', 'pdf'],
    required: false
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
