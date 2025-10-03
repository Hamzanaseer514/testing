const mongoose = require('mongoose');

const tutorReviewSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    required: function() {
      return !this.parent_id; // Required if parent_id is not provided
    }
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParentProfile',
    required: function() {
      return !this.student_id; // Required if student_id is not provided
    }
  },
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review_text: {
    type: String,
    default: '',
    maxlength: 1000
  },
  review_type: {
    type: String,
    enum: ['student', 'parent'],
    required: true,
    default: 'student'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure one review per student per tutor OR one review per parent per tutor
tutorReviewSchema.index({ student_id: 1, tutor_id: 1 }, { unique: true, partialFilterExpression: { student_id: { $exists: true } } });
tutorReviewSchema.index({ parent_id: 1, tutor_id: 1 }, { unique: true, partialFilterExpression: { parent_id: { $exists: true } } });

module.exports = mongoose.model('TutorReview', tutorReviewSchema);

