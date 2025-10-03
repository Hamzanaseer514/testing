const mongoose = require('mongoose');

const tutoringSessionSchema = new mongoose.Schema({
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: true
  },
  student_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    required: true
  }],
  // Payment tracking - for group sessions (multiple students)
  student_payments: [
    {
      student_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'StudentProfile', 
        required: true 
      },
      payment_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'StudentPayment', 
        required: true 
      }
    }
  ],
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  session_date: {
    type: Date,
    required: true
  },
  academic_level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationLevel',
    required: true
  },
  duration_hours: {
    type: Number,
    required: true,
    min: 0.25, // Minimum 15 minutes
    max: 8     // Maximum 8 hours per session
  },
  hourly_rate: {
    type: Number,
    required: true,
    min: 0
  },
  total_earnings: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    default: ''
  },
  // Per-student ratings
  student_ratings: [
    {
      student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
      rating: { type: Number, min: 1, max: 5, required: true },
      feedback: { type: String, default: '' },
      rated_at: { type: Date, default: Date.now }
    }
  ],
  // Per-student response tracking for group sessions
  student_responses: [
    {
      student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentProfile',
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'declined'],
        default: 'pending'
      },
      responded_at: {
        type: Date
      },
      note: {
        type: String,
        default: ''
      }
    }
  ],
  meeting_link: {
    type: String,
    default: ''
  },
  meeting_link_sent_at: {
    type: Date
  },
  completed_at: {
    type: Date
  }
}, { timestamps: true });

// ✅ Composite index (avoid duplicate single-field tutor_id index)
tutoringSessionSchema.index({ tutor_id: 1, status: 1 });

// ✅ Supporting indexes
tutoringSessionSchema.index({ session_date: 1 });
tutoringSessionSchema.index({ student_ids: 1 });
// Helpful for response lookups per student
tutoringSessionSchema.index({ 'student_responses.student_id': 1 });
// Helpful for rating lookups per student
tutoringSessionSchema.index({ 'student_ratings.student_id': 1 });

module.exports = mongoose.model('TutoringSession', tutoringSessionSchema);
