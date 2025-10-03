const express = require("express");
const router = express.Router();
const { protect } = require("../Middleware/authMiddleware");
const {
  addStudentToParent,
  getParentProfile,
  updateParentProfile,
  getParentDashboardStats,
  getSpecificStudentDetail,
  getParentStudentsPayments,
  getParentStudentSessions,
  deleteChildFromParent,
  searchTutors,
  getParentHiredTutors,
  submitParentReview,
  getParentReviews
} = require("../Controllers/ParentController");

// Parent dashboard routes
router.get("/profile/:user_id", protect, getParentProfile);
router.post("/add-student", protect, addStudentToParent);
router.put("/profile/:user_id", protect, updateParentProfile);
router.get("/dashboard-stats/:user_id", protect, getParentDashboardStats);
router.get("/student/:userId", protect, getSpecificStudentDetail);
router.get("/payments/:user_id", protect, getParentStudentsPayments);
router.get("/sessions/:user_id", protect, getParentStudentSessions);
router.delete("/child/:childId", protect, deleteChildFromParent);
router.get("/tutors/search", protect, searchTutors);
router.get("/hired-tutors/:user_id", protect, getParentHiredTutors);
router.post("/review/:user_id", protect, submitParentReview);
router.get("/reviews/:user_id", protect, getParentReviews);

module.exports = router;
