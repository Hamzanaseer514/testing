const express = require("express")
const router = express.Router()
const { registerUser, registerTutor, registerParent, loginUser, verifyOtp, resendOtp,
  addAdmin, forgotPassword, resetPassword,
  registerStudentWithGoogle, loginWithGoogle, testGoogleOAuth,
  sendEmailVerification, verifyEmail } = require("../Controllers/UserController")
const { getStudentDashboard, updateStudentProfile,
  getStudentSessions, searchTutors, getTutorDetails,
  requestAdditionalHelp, getStudentHelpRequests, hireTutor,
  sendMessage, getAcceptedTutorsForStudent,
  getStudentTutorChat,
  getHiredTutors,
  rateSession,
  getStudentProfile,
  getStudentPayments,
  processStudentPayment,
  checkStudentPaymentStatus,
  rateTutor,
  getTutorReviews,
  getStudentTutorReview,
  createRenewalPayment } = require("../Controllers/StudentController")
const { getUserProfile, updateUserPhoto, refreshAccessToken, logoutUser } = require("../Controllers/UserController")

const { protect } = require("../Middleware/authMiddleware")
// Import the Vercel-compatible multer config
const upload = require('../Utils/multerConfig');


router.get("/student/profile/:userId", protect, getStudentProfile);
router.post("/register", registerUser)
router.post("/register-google", registerStudentWithGoogle) // Google OAuth registration for students
router.post("/login-google", loginWithGoogle) // Google OAuth login for all users
router.get("/test-google-oauth", testGoogleOAuth) // Test Google OAuth configuration
router.put("/updatestudent/:user_id", updateStudentProfile)
router.post("/register-tutor", upload.fields([{ name: 'documents', maxCount: 10 }]), registerTutor);
router.post("/register-parent", registerParent)
router.post("/login", loginUser)
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

router.post("/verify-otp", verifyOtp)
router.post("/resend-otp", resendOtp)
router.post("/send-email-verification", sendEmailVerification)
router.post("/verify-email", verifyEmail)
router.post("/add-admin", addAdmin)
router.post("/forget-password", forgotPassword)
router.put("/reset-password", resetPassword)
router.post("/send-message", protect, sendMessage)
router.get("/get-accepted-tutors", protect, getAcceptedTutorsForStudent);
router.get('/getstudentchat/:tutorId', protect, getStudentTutorChat);
router.get('/user-profile/:user_id', protect, getUserProfile);
router.post('/user-profile/:user_id/photo', protect, upload.single('photo'), updateUserPhoto);

// Student dashboard routes
router.get("/student/dashboard/:userId", protect, getStudentDashboard);
router.get("/student/sessions/:userId", protect, getStudentSessions);
router.post("/student/sessions/:session_id/rate", protect, rateSession);


// Tutor search and help request routes
router.get("/tutors/search", protect, searchTutors);
router.get("/tutors/:tutorId", protect, getTutorDetails);
router.post("/tutors/sessions", protect, hireTutor);


router.post("/student/:userId/help-request", protect, requestAdditionalHelp);
router.get("/student/:userId/help-requests", protect, getStudentHelpRequests);
router.get("/student/:userId/hired-tutors", protect, getHiredTutors);

// Payment routes
router.get("/student/payments/:userId", protect, getStudentPayments);
router.post("/student/payments/:paymentId/pay", protect, processStudentPayment);
router.post("/student/payments/:expiredPaymentId/renew", protect, createRenewalPayment);
router.get("/student/payment-status/:userId", protect, checkStudentPaymentStatus);

// Tutor rating and review routes
router.post("/student/:userId/rate-tutor", protect, rateTutor);
router.get("/tutor/:tutorId/reviews", getTutorReviews);
router.get("/student/:userId/tutor/:tutorId/review", protect, getStudentTutorReview);

// Parent routes
router.post("/register-parent", upload.single('photo'), registerParent)


module.exports = router;            