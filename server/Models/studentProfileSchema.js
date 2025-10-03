const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academic_level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EducationLevel",
      default: null,
    },
    learning_goals: {
      type: String,
      default: "Improve academic performance and develop strong study skills",
    },
    preferred_subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    }],
    availability: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
        duration: {
          type: String,
          enum: [
            "1-2 hours",
            "3-4 hours",
            "4-5 hours",
            "5-6 hours",
            "6+ hours",
          ],
        },
      },
    ],
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParentProfile",
      default: null,
    },
    // Array of tutors with status
    hired_tutors: [
      {
        tutor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TutorProfile",
          default: null,
        },
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          default: null,
        },
        academic_level_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EducationLevel",
          default: null,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        hired_at: {
          type: Date,
          default: Date.now,
        }
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
