const mongoose = require('mongoose');

const tutorInquirySchema = new mongoose.Schema({
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: false // Optional for general help requests
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  academic_level: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  message: {
    type: String,
    required: false
  },
  preferred_schedule: {
    type: String,
    required: false
  },
  urgency_level: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  type: {
    type: String,
    enum: ['additional_help', 'tutor_inquiry'],
    default: 'additional_help'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'unread', 'read', 'replied', 'converted_to_booking'],
    default: 'pending'
  },
  response_time_minutes: {
    type: Number,
    default: null
  },
  replied_at: {
    type: Date
  },
  reply_message: {
    type: String,
    required: false
  },
  converted_to_session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutoringSession'
  }
}, { timestamps: true });

// Index for efficient queries
tutorInquirySchema.index({ tutor_id: 1, status: 1 });
tutorInquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('TutorInquiry', tutorInquirySchema); 