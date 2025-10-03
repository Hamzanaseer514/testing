const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { 
  uploadDocument, 
  getTutorDashboard, 
  createSession, 
  updateSessionStatus, 
  getTutorSessions, 
  getTutorInquiries, 
  replyToInquiry, 
  getTutorStats, 
  getTutorProfile,
  getMyInterviewSlots,
  getAvailableStudents,
  getTutorAvailability,
  updateGeneralAvailability,
  addBlackoutDate,
  updateBlackoutDate,
  removeBlackoutDate,
  getAvailableSlots,
  checkAvailability,
  requestInterviewAgain,
  getHireRequests,
  respondToHireRequest,
  sendMessageResponse,
  getTutorMessages,
  getUnansweredMessagesCount,
  getSpecificUserChat,
  deleteSession,
  getVerifiedTutors,
  getTutorSettings,
  updateTutorSettings,
  addTutorAcademicLevel,
  removeTutorAcademicLevel,
  sendMeetingLink,
  // getStudentPaymentStatus,
  getHiredSubjectsAndLevels,
  getTutorPaymentHistory,
  getRejectedDocuments,
  reuploadDocument,
} = require('../Controllers/tutorController');
const {protect} = require('../Middleware/authMiddleware');

// Multer config for tutor documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },  
  filename: (req, file, cb) => {
    const documentType = req.body.document_type?.replace(/\s+/g, '_') || 'unknownType';
    const ext = path.extname(file.originalname);
    console.log("file", ext);
    const base = path.basename(file.originalname, ext);
    console.log("base", base);
    const newFileName = `${base}${ext}`;
    console.log("newFileName", newFileName);
    cb(null, newFileName);
  }
});

const upload = multer({ storage });

// Public routes (no authentication required)
router.get('/verified', getVerifiedTutors);

// Document upload route
router.post('/upload-document', upload.single('document'), uploadDocument);
router.get('/rejected-documents/:user_id', protect, getRejectedDocuments);
router.post('/reupload-document/:user_id', protect, upload.single('document'), reuploadDocument);

// Dashboard routes
router.get('/dashboard/:user_id', protect, getTutorDashboard);
router.get('/profile/:user_id', protect, getTutorProfile);
router.get('/interview-slots/:user_id', protect, getMyInterviewSlots);
router.post('/interview-slots/:user_id/request-again', protect, requestInterviewAgain);
router.get('/stats/:user_id', protect, getTutorStats);

// Session management routes
router.post('/sessions', protect, createSession);
router.put('/sessions/update/:session_id', protect, updateSessionStatus);
router.delete('/sessions/delete/:session_id', protect, deleteSession);
router.post('/sessions/:session_id/send-link', protect, sendMeetingLink);

router.get('/sessions/:user_id', protect, getTutorSessions);

// Inquiry management routes
router.get('/inquiries/:user_id', protect, getTutorInquiries);
router.put('/inquiries/:inquiry_id/reply', protect, replyToInquiry);

// Student management routes
router.get('/students/:user_id', protect, getAvailableStudents);

// Availability management routes

router.get('/availability/:user_id', protect, getTutorAvailability);
router.put('/availability/:user_id/general', protect, updateGeneralAvailability);
router.post('/availability/:user_id/blackout', protect, addBlackoutDate);
router.put('/availability/:user_id/blackout/:blackout_id', protect, updateBlackoutDate);
router.delete('/availability/:user_id/blackout/:blackout_id', protect, removeBlackoutDate);
router.get('/availability/:user_id/slots', protect, getAvailableSlots);
router.get('/availability/:user_id/check', protect, checkAvailability);


// Hire requests
router.get('/hire-requests/:user_id', protect, getHireRequests);
router.post('/hire-requests/:user_id/respond', protect, respondToHireRequest);

// Message management routes
router.post('/messages/reply', protect, sendMessageResponse);
router.get('/getallmessages', protect, getTutorMessages);
router.get('/getallmessages/:studentId', protect, getSpecificUserChat);
router.get('/unanswered-messages-count', protect, getUnansweredMessagesCount);

// Tutor settings routes
router.get('/settings/:user_id', getTutorSettings);
router.put('/settings/update/:user_id', protect, updateTutorSettings);
router.post('/settings/:user_id/level', protect, addTutorAcademicLevel);
router.delete('/settings/delete/:user_id/level/:education_level_id', protect, removeTutorAcademicLevel);
router.get('/hired-subjects-and-levels/:studentId/:tutorId', getHiredSubjectsAndLevels);

// Payment history routes
router.get('/payment-history/:user_id', protect, getTutorPaymentHistory);

// Student payment status routes
// router.get('/student-payment-status/:studentId', protect, getStudentPaymentStatus);

module.exports = router;