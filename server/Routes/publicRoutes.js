const express = require('express');
const router = express.Router();

// Import models
const { Subject, EducationLevel } = require('../Models/LookupSchema');
const TutorApplication = require('../Models/tutorApplicationSchema');
const TutorProfile = require('../Models/tutorProfileSchema');
const User = require('../Models/userSchema');

// Public API Routes

// Get all subjects grouped by education level
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate("level_id", "level")
      .populate("subject_type", "name")
      .sort({ name: 1 });

    // Group subjects by education level
    const groupedSubjects = subjects.reduce((acc, subject) => {
      const levelName = subject.level_id?.level || 'Unknown';
      if (!acc[levelName]) {
        acc[levelName] = [];
      }
      acc[levelName].push({
        id: subject._id,
        name: subject.name,
        level: levelName,
        subjectType: subject.subject_type?.name || 'General'
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: groupedSubjects
    });
  } catch (error) {
    console.error("Error fetching public subjects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
});

// Get all education levels
router.get('/education-levels', async (req, res) => {
  try {
    const levels = await EducationLevel.find()
      .select('level')
      .sort({ level: 1 });

    res.status(200).json({
      success: true,
      data: levels.map(level => ({ id: level._id, name: level.level }))
    });
  } catch (error) {
    console.error("Error fetching education levels:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch education levels",
      error: error.message
    });
  }
});

// Get subjects by education level
router.get('/subjects/:levelId', async (req, res) => {
  try {
    const { levelId } = req.params;
    
    const subjects = await Subject.find({ level_id: levelId })
      .populate("level_id", "level")
      .populate("subject_type", "name")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: subjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        level: subject.level_id?.level || 'Unknown',
        subjectType: subject.subject_type?.name || 'General'
      }))
    });
  } catch (error) {
    console.error("Error fetching subjects by level:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
});

// Interview Token Routes (Public - No Authentication Required)

// Get interview slots by token
router.get('/interview/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find application by interview token
    const application = await TutorApplication.findOne({ 
      interview_token: token,
      expire_token: { $gt: new Date() } // Token not expired
    }).populate('tutor_id');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired interview token"
      });
    }
    
    // Get tutor profile and user details
    const tutorProfile = await TutorProfile.findById(application.tutor_id._id);
    const tutorUser = await User.findById(tutorProfile.user_id);
    
    res.status(200).json({
      success: true,
      data: {
        tutor_name: tutorUser.full_name,
        tutor_email: tutorUser.email,
        preferred_interview_times: application.preferred_interview_times,
        interview_status: application.interview_status,
        scheduled_time: application.scheduled_time,
        application_status: application.application_status,
        token_expires_at: application.expire_token
      }
    });
  } catch (error) {
    console.error("Error fetching interview slots by token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interview slots",
      error: error.message
    });
  }
});

// Select interview slot by token
router.post('/interview/:token/select', async (req, res) => {
  try {
    const { token } = req.params;
    const { scheduled_time } = req.body;
    
    if (!scheduled_time) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time is required"
      });
    }
    
    // Find application by interview token
    const application = await TutorApplication.findOne({ 
      interview_token: token,
      expire_token: { $gt: new Date() } // Token not expired
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired interview token"
      });
    }
    
    // Check if the selected time is in the preferred times
    const selectedTime = new Date(scheduled_time);
    const isPreferredTime = application.preferred_interview_times.some(time => {
      const preferredTime = new Date(time);
      return preferredTime.getTime() === selectedTime.getTime();
    });
    
    if (!isPreferredTime) {
      return res.status(400).json({
        success: false,
        message: "Selected time is not in the available slots"
      });
    }
    
    // Update the application with selected time
    application.scheduled_time = selectedTime;
    application.interview_status = 'Scheduled';
    await application.save();
    
    // Get tutor details for response
    const tutorProfile = await TutorProfile.findById(application.tutor_id);
    const tutorUser = await User.findById(tutorProfile.user_id);
    
    res.status(200).json({
      success: true,
      message: "Interview slot selected successfully",
      data: {
        tutor_name: tutorUser.full_name,
        scheduled_time: application.scheduled_time,
        interview_status: application.interview_status
      }
    });
  } catch (error) {
    console.error("Error selecting interview slot:", error);
    res.status(500).json({
      success: false,
      message: "Failed to select interview slot",
      error: error.message
    });
  }
});

module.exports = router;
