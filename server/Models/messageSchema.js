const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['unanswered', 'answered'],
      default: 'unanswered',
    },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
