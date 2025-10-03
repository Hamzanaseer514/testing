const mongoose = require('mongoose');
const tutorApplicationSchema = new mongoose.Schema({
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: true
  },
  is_interview: {
    type: Boolean,
    default: false
  },
  interview_status: {
    type: String,
    enum: ['Pending', 'Scheduled', 'Passed', 'Failed'],
    default: 'Pending'
  },
  code_of_conduct_agreed: {
    type: Boolean,
    default: false
  },
   preferred_interview_times: {
    type: [Date],
    default: []
  },
  scheduled_time: {
    type: Date,
    default: null
  },
  application_status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  again_interview: {
    type: Boolean,
    default: false
  },
  applied_at: {
    type: Date,
    default: Date.now
  },
  interview_token: {
    type: String,
    default: null
  },
  expire_token: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('TutorApplication', tutorApplicationSchema);