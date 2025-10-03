// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../Middleware/authMiddleware");
const {
  setAvailableInterviewSlots,
  getAllPendingApplications,
  selectInterviewSlot,
  approveTutorProfile,
  rejectTutorProfile,
  partialApproveTutor,
  verifyDocument,
  rejectGroupedDocuments,
  // New comprehensive admin functions
  getAllUsers,
  getTutorDetails,
  completeInterview,
  getAvailableInterviewSlots,
  updateApplicationNotes,
  getDashboardStats,
  updateInterviewToggle,
  toggleOtpRule,
  addEducationLevel,
  getEducationLevels,
  getOtpStatus,
  updateEducationLevel,
  deleteEducationLevel,
  getSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  getAllChatsOfUsers,
  manageEducationLevel,
  addSubjectType,
  getSubjectTypes,
  updateSubjectType,
  deleteSubjectType,
  fetchSubjectRelatedToAcademicLevels,
    getAllTutorSessions,
  getAllTutorPayments,
  getAllTutorReviews
} = require("../Controllers/adminController");



// ADD RULED AND EDUCATOIN LEVEL.
router.post("/rules/toggle-otp", toggleOtpRule);
router.get("/rules/otp-status", getOtpStatus);
router.post("/education-levels", addEducationLevel);
router.get("/education-levels", getEducationLevels);
router.put("/education-levels/:id", updateEducationLevel);
router.delete("/education-levels/:id", deleteEducationLevel);
router.put("/education-levels/:id/manage", manageEducationLevel);

// Subjects
router.post("/subjects", addSubject);
router.get("/subjects", getSubjects);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);
router.get("/levelsubjects", fetchSubjectRelatedToAcademicLevels);

// Subjects Type
router.post("/subject-types", addSubjectType);
router.get("/subject-types", getSubjectTypes);
router.put("/subject-types/:id", updateSubjectType);
router.delete("/subject-types/:id", deleteSubjectType);

// users chat
router.get("/chats", getAllChatsOfUsers);

// Existing routes
router.get("/tutors/applications/pending", getAllPendingApplications);
router.put("/tutors/interview/assign", setAvailableInterviewSlots);
router.post("/tutors/interview/select", selectInterviewSlot);
router.put("/tutors/:user_id/interview-toggle", updateInterviewToggle);

router.post("/tutors/approve", approveTutorProfile);
router.post("/tutors/reject", rejectTutorProfile);
router.post("/tutors/partial-approve", partialApproveTutor);
router.post("/tutors/verify/document", verifyDocument);
router.post("/tutors/reject/grouped-documents", rejectGroupedDocuments);

// New comprehensive admin routes
router.get("/users", getAllUsers);
router.get("/tutors/:user_id", getTutorDetails);
router.post("/interviews/complete", completeInterview);
router.get("/interviews/available-slots", getAvailableInterviewSlots);
router.put("/applications/notes", updateApplicationNotes);
router.get("/dashboard/stats", getDashboardStats);
router.get("/tutor-sessions", getAllTutorSessions);
router.get("/tutor-payments", getAllTutorPayments);
router.get("/tutor-reviews", getAllTutorReviews);
// User management
router.put("/users/:user_id/status", require("../Controllers/adminController").updateUserStatus);

module.exports = router;
