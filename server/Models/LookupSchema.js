const mongoose = require("mongoose");

const EducationLevelSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    trim: true,
  },
  hourlyRate: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSessionsPerMonth: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  monthlyRate: {
    type: Number,
    min: 0,
  },
  isTutorCanChangeRate: {
    type: Boolean,
    default: false,
  },
  maxSession: {
    type: Number,
    default: 0,
    min: 0,
  },
  minSession: {
    type: Number,
    default: 0,
    min: 0,
  },
});

EducationLevelSchema.pre("save", function (next) {
  const gross = this.hourlyRate * this.totalSessionsPerMonth;
  const discountAmount = (gross * this.discount) / 100;
  this.monthlyRate = gross - discountAmount;
  next();
});
const EducationLevel = mongoose.model("EducationLevel", EducationLevelSchema);

const SubjectsSchema = new mongoose.Schema({
  subject_id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  level_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EducationLevel",
    required: true,
  },
  subject_type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubjectType",
    required: true,
  },
});

const Subject = mongoose.model("Subject", SubjectsSchema);


const SubjectTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
});

const SubjectType = mongoose.model("SubjectType", SubjectTypeSchema);
module.exports = { Subject, EducationLevel, SubjectType };
