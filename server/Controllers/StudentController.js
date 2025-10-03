const asyncHandler = require("express-async-handler");
const User = require("../Models/userSchema");
const Student = require("../Models/studentProfileSchema");
const TutorProfile = require("../Models/tutorProfileSchema");
const TutoringSession = require("../Models/tutoringSessionSchema"); // Added for student dashboard
const TutorInquiry = require("../Models/tutorInquirySchema"); // Added for tutor search and help requests
const StudentPayment = require("../Models/studentPaymentSchema"); // Added for student payments
const Message = require("../Models/messageSchema"); // Added for messaging
const TutorReview = require("../Models/tutorReviewSchema"); // Added for tutor reviews
const { EducationLevel, Subject } = require("../Models/LookupSchema");




exports.getStudentProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
        res.status(404);
        throw new Error('Student not found');
    }
    const studentProfile = await Student.findOne({ user_id: userId });
    res.status(200).json({
        student: studentProfile,
    });
});

// Student Dashboard Controllers
exports.getStudentDashboard = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
        res.status(404);
        throw new Error('Student not found');
    }

    // Get student profile with assignments and notes
    const studentProfile = await Student.findOne({ user_id: userId });

    const upcomingSessions = await TutoringSession.find({
        student_ids: studentProfile._id, // changed from student_id to student_ids
        session_date: { $gte: new Date() },
        status: { $in: ['confirmed', 'pending'] }
    })
        .populate({
            path: "tutor_id",
            select: "user_id", // only include user_id from TutorProfile
            populate: {
                path: "user_id",
                select: "full_name email", // only include name & email from User
            },
        })
        .sort({ session_date: 1 })
        .limit(10);

    const pastSessions = await TutoringSession.find({
        student_ids: studentProfile._id,
        // session_date: { $lt: new Date() },
        status: 'completed'
    })
        .populate({
            path: "tutor_id",
            select: "user_id", // only include user_id from TutorProfile
            populate: {
                path: "user_id",
                select: "full_name email", // only include name & email from User
            },
        })
        .sort({ session_date: -1 })
        .limit(10);

    // Get pending payments for academic level access
    const pendingPayments = await StudentPayment.find({
        student_id: studentProfile._id,
        payment_status: 'pending'
    }).populate([
        {
            path: "tutor_id",
            select: "user_id",
            populate: {
                path: "user_id",
                select: "full_name"
            }
        },
        {
            path: "subject",
            select: "name"
        },
        {
            path: "academic_level",
            select: "level"
        }
    ]);

    res.status(200).json({
        student: {
            _id: studentProfile._id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            age: user.age,
            photo_url: user.photo_url
        },
        profile: studentProfile,
        upcomingSessions,
        pastSessions,
        pendingPayments,
    });
});


exports.getStudentSessions = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
        res.status(404);
        throw new Error('Student not found');
    }

    const studentProfile = await Student.findOne({ user_id: userId });

    const query = { student_ids: studentProfile._id };
    if (status && status !== 'all') {
        query.status = status;
    }

    const sessions = await TutoringSession.find(query)
        .populate({
            path: "tutor_id",
            select: "user_id",
            populate: {
                path: "user_id",
                select: "full_name email photo_url",
            },
        })
        .populate({
            path: 'student_responses.student_id',
            select: 'user_id',
            populate: { path: 'user_id', select: 'full_name email photo_url' }
        })
        .populate({
            path: 'student_ratings.student_id',
            select: 'user_id',
            populate: { path: 'user_id', select: 'full_name email photo_url' }
        })
        .sort({ session_date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // 🔑 Check payments for each tutor-session
    const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const payment = await StudentPayment.findOne({
            student_id: studentProfile._id,
            tutor_id: session.tutor_id._id,
            payment_status: 'paid',
            academic_level_paid: true,
            validity_status: 'active',
            is_active: true
        });

        // Check if payment is valid (not expired)
        const isPaymentValid = payment ? payment.isValid() : false;

        return {
            ...session.toObject(),
            payment_required: !payment || !isPaymentValid, // payment required if no payment or payment expired
            payment_status: payment ? payment.getPaymentStatus() : 'none',
        };
    }));

    const total = await TutoringSession.countDocuments(query);
    res.status(200).json({
        sessions: enrichedSessions,
        pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    });
});


exports.updateStudentProfile = asyncHandler(async (req, res) => {
    try {
        const {
            full_name,
            phone_number,
            // photo_url,
            age,
            academic_level,
            learning_goals,
            preferred_subjects,
            availability,
        } = req.body;

        const { user_id } = req.params;
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // ✅ Fetch user without invalid enum issues
        const user = await User.findById(user_id).lean(); // lean() removes mongoose doc wrapping
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: "User is not a student"
            });
        }

        // ✅ Prepare update object only with allowed fields
        const userUpdates = {};
        if (phone_number) {
            const existingUser = await User.findOne({ phone_number });
            if (existingUser && existingUser._id.toString() !== user_id) {
                return res.status(400).json({ success: false, message: "Phone number already in use" });
            }
            userUpdates.phone_number = phone_number;
        }
        if (full_name) userUpdates.full_name = full_name;
        // if (photo_url) userUpdates.photo_url = photo_url;
        if (age) userUpdates.age = age;

        // ✅ Update without touching is_verified
        await User.updateOne(
            { _id: user_id },
            { $set: userUpdates },
            { runValidators: true }
        );

        // Update student profile
        const studentProfile = await Student.findOne({ user_id });
        if (!studentProfile) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        if (academic_level) studentProfile.academic_level = academic_level;
        if (learning_goals) studentProfile.learning_goals = learning_goals;
        if (Array.isArray(preferred_subjects) && preferred_subjects.length > 0) {
            studentProfile.preferred_subjects = preferred_subjects;
        }
        if (Array.isArray(availability) && availability.length > 0) {
            studentProfile.availability = availability;
        }

        await studentProfile.save();

        return res.status(200).json({
            success: true,
            message: "Student profile updated successfully",
            user: userUpdates,
            student: {
                academic_level: studentProfile.academic_level,
                learning_goals: studentProfile.learning_goals,
                preferred_subjects: studentProfile.preferred_subjects,
                availability: studentProfile.availability,
            },
        });

    } catch (error) {
        console.error("Error updating student profile:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating student profile",
            error: error.message
        });
    }
});

exports.searchTutors = asyncHandler(async (req, res) => {
    const {
      search,
      subject_id, // single subject filter
      academic_level,
      location,
      min_rating,
      preferred_subjects_only,
      page = 1,
      limit = 10
    } = req.query;
  
    try {
      // Get current student profile
      const currentStudent = await Student.findOne({ user_id: req.user._id });
      if (!currentStudent) {
        res.status(404);
        throw new Error("Student profile not found");
      }
  
      const query = {
        profile_status: "approved", // restrict to approved tutors
      };
  
      // Preferred subjects filter
      if (
        preferred_subjects_only === "true" &&
        currentStudent.preferred_subjects &&
        currentStudent.preferred_subjects.length > 0
      ) {
        query.subjects = { $in: currentStudent.preferred_subjects };
      } else if (subject_id) {
        if (subject_id.match(/^[0-9a-fA-F]{24}$/)) {
          query.subjects = { $in: [subject_id] };
        }
      }
  
      // Academic level filter
      if (academic_level && academic_level.match(/^[0-9a-fA-F]{24}$/)) {
        query["academic_levels_taught.educationLevel"] = academic_level;
      }
  
      // Location filter
      if (location) {
        query.location = new RegExp(location, "i");
      }
  
      // Rating filter
      if (min_rating) {
        query.average_rating = { $gte: parseFloat(min_rating) };
      }
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      let searchQuery = { ...query };
      let userIds = [];
  
      // 🔎 Handle search term (name OR subject)
      if (search) {
        // Match tutors by name
        const matchingUsers = await User.find({
          full_name: { $regex: search, $options: "i" },
          role: "tutor",
        }).select("_id");
  
        userIds = matchingUsers.map((user) => user._id);
  
        // Match subjects by name
        const matchingSubjects = await Subject.find({
          name: { $regex: search, $options: "i" },
        }).select("_id");
  
        const subjectIds = matchingSubjects.map((s) => s._id);
  
        const searchOrConditions = [
          ...(userIds.length ? [{ user_id: { $in: userIds } }] : []),
          ...(subjectIds.length ? [{ subjects: { $in: subjectIds } }] : []),
        ];
  
        searchQuery = {
          ...query,
          $or: searchOrConditions.length > 0 ? searchOrConditions : [{}],
        };
      }
  
      // Preserve subject filter if provided explicitly
      if (subject_id && !searchQuery.subjects) {
        searchQuery.subjects = { $in: [subject_id] };
      }
  
      // Fetch tutors
      const tutors = await TutorProfile.find(searchQuery)
        .populate("user_id", "full_name email photo_url")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ average_rating: -1 })
        .lean();
  
      // Collect academic levels
      const tutorAcademicLevelIds = tutors.flatMap((tutor) =>
        (tutor.academic_levels_taught || []).map(
          (level) => level.educationLevel
        )
      );
  
      const academicLevels = await EducationLevel.find({
        _id: { $in: tutorAcademicLevelIds },
      });
  
      const academicLevelMap = {};
      academicLevels.forEach((level) => {
        academicLevelMap[level._id.toString()] = level;
      });
  
      // Count total tutors
      const total = await TutorProfile.countDocuments(searchQuery);
  
      // Count sessions for all tutors found
      const totalSessions = await TutoringSession.countDocuments({
        tutor_id: { $in: tutors.map((tutor) => tutor._id) },
      });
  
      // Format tutors
      const formattedTutors = tutors
        .filter((tutor) => tutor.user_id)
        .map((tutor) => {
          const hireRecord = currentStudent.hired_tutors.find(
            (hire) => hire.tutor.toString() === tutor._id.toString()
          );
  
          const tutorAcademicLevels = (tutor.academic_levels_taught || []).map(
            (levelObj) => {
              const levelDoc =
                academicLevelMap[levelObj.educationLevel?.toString()];
  
              return {
                name: levelDoc ? levelDoc.level : levelObj.name || "Unknown",
                hourlyRate:
                  levelObj.hourlyRate || (levelDoc ? levelDoc.hourlyRate : 0),
              };
            }
          );
  
          const tutorHourlyRates = tutorAcademicLevels
            .map((level) => level.hourlyRate)
            .filter((rate) => rate > 0);
  
          const min_hourly_rate_value =
            tutorHourlyRates.length > 0 ? Math.min(...tutorHourlyRates) : 0;
          const max_hourly_rate_value =
            tutorHourlyRates.length > 0 ? Math.max(...tutorHourlyRates) : 0;
  
          return {
            _id: tutor._id,
            user_id: tutor.user_id,
            subjects: tutor.subjects,
            academic_levels_taught: tutor.academic_levels_taught,
            min_hourly_rate: min_hourly_rate_value,
            max_hourly_rate: max_hourly_rate_value,
            average_rating: tutor.average_rating,
            total_sessions: totalSessions,
            location: tutor.location,
            bio: tutor.bio,
            qualifications: tutor.qualifications,
            experience_years: tutor.experience_years,
            is_hired: !!hireRecord,
            hire_status: hireRecord ? hireRecord.status : null,
            hired_at: hireRecord ? hireRecord.hired_at : null,
          };
        });
  
      // Send response
      res.status(200).json({
        tutors: formattedTutors,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_tutors: total,
          has_next: skip + parseInt(limit) < total,
          has_prev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      res.status(500);
      throw new Error("Failed to search tutors: " + error.message);
    }
});

// Rate a tutor (not session-specific)
exports.rateTutor = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { tutor_id, rating, review_text } = req.body;

    if (!tutor_id || !rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tutor ID and rating (1-5) are required' 
        });
    }

    try {
        // Get student profile
        const studentProfile = await Student.findOne({ user_id: userId });
        if (!studentProfile) {
            return res.status(404).json({ 
                success: false, 
                message: 'Student profile not found' 
            });
        }

        // Verify tutor exists
        const tutor = await TutorProfile.findById(tutor_id);
        if (!tutor) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tutor not found' 
            });
        }

        // Check if student has hired this tutor
        const hireRecord = studentProfile.hired_tutors.find(
            hire => hire.tutor.toString() === tutor_id.toString()
        );
      
        
        if (!hireRecord) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only rate tutors you have paid.' 
            });
        }

        // Check if student has paid for this tutor with valid payment
        const payment = await StudentPayment.findOne({
            student_id: studentProfile._id,
            tutor_id: tutor_id,
            payment_status: "paid",
            academic_level_paid: true,
            validity_status: "active", // Check for active validity status

        });

        if (!payment) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only rate tutors after making payment' 
            });
        }

        // Check if payment is still valid
        if (!payment.isValid()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your payment has expired. Please make a new payment to rate tutors.' 
            });
        }

        // Create or update review
        const existingReview = await TutorReview.findOne({
            student_id: studentProfile._id,
            tutor_id: tutor_id
        });

        let review;
        if (existingReview) {
            // Update existing review
            existingReview.rating = Number(rating);
            existingReview.review_text = review_text || '';
            existingReview.review_type = 'student'; // Ensure review_type is set
            existingReview.updated_at = new Date();
            await existingReview.save();
            review = existingReview;
        } else {
            // Create new review
            review = await TutorReview.create({
                student_id: studentProfile._id,
                tutor_id: tutor_id,
                rating: Number(rating),
                review_text: review_text || '',
                review_type: 'student'
            });
        }

        // Update tutor's average rating
        const reviews = await TutorReview.find({ tutor_id: tutor_id });
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
        console.log('averageRating', averageRating);
        console.log('reviews', totalRating);
        await TutorProfile.findByIdAndUpdate(
            tutor_id,
            { average_rating: Math.round(averageRating * 10) / 10 },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: existingReview ? 'Review updated successfully' : 'Review submitted successfully',
            review: {
                _id: review._id,
                rating: review.rating,
                review_text: review.review_text,
                created_at: review.created_at,
                updated_at: review.updated_at
            }
        });

    } catch (error) {
        console.error('Error rating tutor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit review',
            error: error.message
        });
    }
});

// Get tutor reviews
exports.getTutorReviews = asyncHandler(async (req, res) => {
    const { tutorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await TutorReview.find({ tutor_id: tutorId })
            .populate({
                path: 'student_id',
                select: 'user_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name photo_url'
                }
            })
            .populate({
                path: 'parent_id',
                select: 'user_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name photo_url'
                }
            })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await TutorReview.countDocuments({ tutor_id: tutorId });

        const formattedReviews = reviews.map(review => {
            const isStudentReview = review.student_id && review.review_type === 'student';
            const isParentReview = review.parent_id && review.review_type === 'parent';
            
            return {
                _id: review._id,
                rating: review.rating,
                review_text: review.review_text,
                review_type: review.review_type || 'student', // Default to student for backward compatibility
                reviewer: {
                    type: isStudentReview ? 'student' : isParentReview ? 'parent' : 'unknown',
                    name: isStudentReview 
                        ? (review.student_id?.user_id?.full_name || 'Anonymous Student')
                        : isParentReview 
                        ? (review.parent_id?.user_id?.full_name || 'Anonymous Parent')
                        : 'Anonymous',
                    photo_url: isStudentReview 
                        ? (review.student_id?.user_id?.photo_url || '')
                        : isParentReview 
                        ? (review.parent_id?.user_id?.photo_url || '')
                        : ''
                },
                // Keep backward compatibility
                student_name: isStudentReview 
                    ? (review.student_id?.user_id?.full_name || 'Anonymous')
                    : isParentReview 
                    ? (review.parent_id?.user_id?.full_name || 'Anonymous')
                    : 'Anonymous',
                student_photo: isStudentReview 
                    ? (review.student_id?.user_id?.photo_url || '')
                    : isParentReview 
                    ? (review.parent_id?.user_id?.photo_url || '')
                    : '',
                created_at: review.created_at,
                updated_at: review.updated_at
            };
        });

        res.status(200).json({
            success: true,
            reviews: formattedReviews,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / parseInt(limit)),
                total_reviews: total,
                has_next: skip + parseInt(limit) < total,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching tutor reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
});

// Get student's review for a specific tutor
exports.getStudentTutorReview = asyncHandler(async (req, res) => {
    const { userId, tutorId } = req.params;

    try {
        const studentProfile = await Student.findOne({ user_id: userId });
        if (!studentProfile) {
            return res.status(404).json({ 
                success: false, 
                message: 'Student profile not found' 
            });
        }

        const review = await TutorReview.findOne({
            student_id: studentProfile._id,
            tutor_id: tutorId
        });

        res.status(200).json({
            success: true,
            review: review ? {
                _id: review._id,
                rating: review.rating,
                review_text: review.review_text,
                created_at: review.created_at,
                updated_at: review.updated_at
            } : null
        });

    } catch (error) {
        console.error('Error fetching student tutor review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch review',
            error: error.message
        });
    }
});



exports.getTutorDetails = asyncHandler(async (req, res) => {
    const { tutorId } = req.params;
    const { isParentView, studentId } = req.query; // Fixed: Use req.query instead of req.body
    
    
    try {
        let currentStudent;
        
        if (isParentView === "true" && studentId) {
            // Parent view - use studentId from query parameters
            currentStudent = await Student.findOne({ user_id: studentId });
        } else {
            // Student view - use current user ID from auth
            currentStudent = await Student.findOne({ user_id: req.user._id });
        }
        
        if (!currentStudent) {
            res.status(404);
            throw new Error("Student profile not found");
        }
        const tutor = await TutorProfile.findOne({
            _id: tutorId,
            profile_status: 'approved', // Changed from is_verified to profile_status
        }).populate('user_id', 'full_name email photo_url');

        if (!tutor) {
            res.status(404);
            throw new Error("Tutor not found");
        }
        const tutor_acdemicLevel_ids = tutor.academic_levels_taught.map(level => level.educationLevel);
        const academicLevels = await EducationLevel.find({ _id: { $in: tutor_acdemicLevel_ids } });
        // Create a map for quick lookup
        const academicLevelMap = {};
        academicLevels.forEach(level => {
            academicLevelMap[level._id.toString()] = level;
        });
        // Get this tutor's academic levels and hourly rates
        const tutorAcademicLevels = tutor.academic_levels_taught.map(level => {
            const levelDoc = academicLevelMap[level.educationLevel.toString()];
            return {
                name: levelDoc ? levelDoc.level : 'Unknown',
                hourlyRate: levelDoc ? levelDoc.hourlyRate : 0
            };
        });

        const tutorHourlyRates = tutorAcademicLevels.map(level => level.hourlyRate).filter(rate => rate > 0);
        const min_hourly_rate_value = tutorHourlyRates.length > 0 ? Math.min(...tutorHourlyRates) : 0;
        const max_hourly_rate_value = tutorHourlyRates.length > 0 ? Math.max(...tutorHourlyRates) : 0;


        const hireRecord = currentStudent.hired_tutors.find(
            hire => hire.tutor.toString() === tutor._id.toString()
        );
        // Get tutor's hiring statistics
        let totalHiringRequests = [];
        try {
            totalHiringRequests = await Student.aggregate([
                {
                    $match: {
                        'hired_tutors.tutor': tutor._id
                    }
                },
                {
                    $unwind: '$hired_tutors'
                },
                {
                    $match: {
                        'hired_tutors.tutor': tutor._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_requests: { $sum: 1 },
                        accepted_requests: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$hired_tutors.status', 'accepted'] },
                                    1,
                                    0
                                ]
                            }
                        },
                        pending_requests: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$hired_tutors.status', 'pending'] },
                                    1,
                                    0
                                ]
                            }
                        },
                        rejected_requests: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$hired_tutors.status', 'rejected'] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);
        } catch (error) {
            console.error('Error in hiring statistics aggregation:', error);
            totalHiringRequests = [];
        }

        // Get tutor's response time statistics from inquiries
        let responseTimeStats = [];
        try {
            responseTimeStats = await TutorInquiry.aggregate([
                {
                    $match: {
                        tutor_id: tutor._id,
                        status: { $in: ['replied', 'converted_to_booking'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_replied: { $sum: 1 },
                        avg_response_time: { $avg: '$response_time_minutes' },
                        min_response_time: { $min: '$response_time_minutes' },
                        max_response_time: { $max: '$response_time_minutes' }
                    }
                }
            ]);
        } catch (error) {
            console.error('Error in response time statistics aggregation:', error);
            responseTimeStats = [];
        }

        // Get total inquiries the tutor has received
        let totalInquiriesReceived = 0;
        try {
            totalInquiriesReceived = await TutorInquiry.countDocuments({
                tutor_id: tutor._id
            });
        } catch (error) {
            console.error('Error counting total inquiries:', error);
            totalInquiriesReceived = 0;
        }

        // Get inquiries by status
        let inquiryStatusStats = [];
        try {
            inquiryStatusStats = await TutorInquiry.aggregate([
                {
                    $match: {
                        tutor_id: tutor._id
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);
        } catch (error) {
            console.error('Error in inquiry status statistics aggregation:', error);
            inquiryStatusStats = [];
        }

        // Check if current student has sent any inquiries to this tutor
        let studentInquiriesToTutor = [];
        try {
            studentInquiriesToTutor = await TutorInquiry.find({
                student_id: currentStudent._id,
                tutor_id: tutor._id
            }).sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error fetching student inquiries:', error);
            studentInquiriesToTutor = [];
        }

        // Get recent inquiries to show response patterns
        let recentInquiries = [];
        try {
            recentInquiries = await TutorInquiry.find({
                tutor_id: tutor._id
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({
                    path: 'student_id',
                    select: 'user_id',
                    populate: {
                        path: 'user_id',
                        select: 'full_name email'
                    }
                });
        } catch (error) {
            console.error('Error fetching recent inquiries:', error);
            recentInquiries = [];
        }

        const hiringStats = totalHiringRequests[0] || {
            total_requests: 0,
            accepted_requests: 0,
            pending_requests: 0,
            rejected_requests: 0
        };

        const responseStats = responseTimeStats[0] || {
            total_replied: 0,
            avg_response_time: 0,
            min_response_time: 0,
            max_response_time: 0
        };

        // Process inquiry status statistics
        const inquiryStats = {};
        inquiryStatusStats.forEach(stat => {
            inquiryStats[stat._id] = stat.count;
        });
        const total_sessions = await TutoringSession.countDocuments({ tutor_id: tutor._id });
        const formattedTutor = {
            _id: tutor._id,
            user_id: tutor.user_id,
            subjects: tutor.subjects,
            academic_levels_taught: tutorAcademicLevels.map(level => level.name),
            min_hourly_rate: min_hourly_rate_value,
            max_hourly_rate: max_hourly_rate_value,
            average_rating: tutor.average_rating,
            total_sessions: total_sessions,
            location: tutor.location,
            bio: tutor.bio,
            qualifications: tutor.qualifications,
            experience_years: tutor.experience_years,
            teaching_approach: tutor.teaching_approach,

            // Hiring status for current student
            hiring_status: {
                is_hired: !!hireRecord,
                status: hireRecord ? hireRecord.status : null,
                hired_at: hireRecord ? hireRecord.hired_at : null
            },

            // Overall hiring statistics
            hiring_statistics: {
                total_requests: hiringStats.total_requests || 0,
                accepted_requests: hiringStats.accepted_requests || 0,
                pending_requests: hiringStats.pending_requests || 0,
                rejected_requests: hiringStats.rejected_requests || 0,
                acceptance_rate: (hiringStats.total_requests || 0) > 0
                    ? (((hiringStats.accepted_requests || 0) / (hiringStats.total_requests || 0)) * 100).toFixed(1)
                    : 0
            },

            // Response time statistics
            response_statistics: {
                total_replied: responseStats.total_replied || 0,
                average_response_time_minutes: Math.round(responseStats.avg_response_time || 0),
                fastest_response_minutes: responseStats.min_response_time || 0,
                slowest_response_minutes: responseStats.max_response_time || 0
            },

            // Inquiry statistics
            inquiry_statistics: {
                total_received: totalInquiriesReceived || 0,
                total_replied: responseStats.total_replied || 0,
                reply_rate: (totalInquiriesReceived || 0) > 0
                    ? (((responseStats.total_replied || 0) / (totalInquiriesReceived || 0)) * 100).toFixed(1)
                    : 0,
                by_status: inquiryStats
            },

            // Current student's inquiries to this tutor
            student_inquiries: (studentInquiriesToTutor || []).map(inquiry => ({
                id: inquiry._id,
                subject: inquiry.subject,
                academic_level: inquiry.academic_level,
                description: inquiry.description,
                status: inquiry.status,
                urgency_level: inquiry.urgency_level,
                created_at: inquiry.createdAt,
                response_time_minutes: inquiry.response_time_minutes,
                reply_message: inquiry.reply_message,
                replied_at: inquiry.replied_at
            })),

            // Recent inquiries for transparency
            recent_inquiries: (recentInquiries || []).map(inquiry => ({
                id: inquiry._id,
                subject: inquiry.subject,
                academic_level: inquiry.academic_level,
                status: inquiry.status,
                urgency_level: inquiry.urgency_level,
                created_at: inquiry.createdAt,
                response_time_minutes: inquiry.response_time_minutes,
                student_name: inquiry.student_id?.user_id?.full_name || 'Anonymous'
            }))
        };

        res.json(formattedTutor);

    } catch (error) {
        res.status(500);
        throw new Error("Failed to get tutor details: " + error.message);
    }
});

// Request help in additional subjects
exports.requestAdditionalHelp = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
        subject,
        academic_level,
        description,
        preferred_schedule,
        urgency_level = 'normal',
        tutor_id // Add tutor_id to destructuring
    } = req.body;
    if (!subject || !academic_level || !description) {
        return res.status(400).json({
            success: false,
            message: "Subject, academic level, and description are required"
        });
    }
    const student = await Student.findOne({ user_id: userId });
    try {
        // Create a new inquiry for additional help
        const inquiry = await TutorInquiry.create({
            student_id: student._id,
            tutor_id: tutor_id, // Save the tutor_id
            subject: subject,
            academic_level: academic_level,
            description: description,
            preferred_schedule: preferred_schedule,
            urgency_level: urgency_level,
            status: 'unread',
            type: 'additional_help'
        });

        return res.status(201).json({
            success: true,
            message: "Help request submitted successfully",
            inquiry: inquiry
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to submit help request: " + error.message
        });
    }
});

// Get student's help requests
exports.getStudentHelpRequests = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, tutor_id } = req.query;

        // Get the base user information
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const student = await Student.findOne({ user_id: userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        const query = { student_id: student._id };
        const total = await TutorInquiry.countDocuments(query);
        const inquiries = await TutorInquiry.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Get tutor profiles and their corresponding users
        const tutorIds = inquiries.map(inquiry => inquiry.tutor_id);
        const tutorProfiles = await TutorProfile.find({ _id: { $in: tutorIds } });
        const userIds = tutorProfiles.map(tutor => tutor.user_id);
        const users = await User.find({ _id: { $in: userIds } });

        // Create a mapping of TutorProfile ID to User data for easy lookup
        const tutorToUserMap = {};
        tutorProfiles.forEach(tutorProfile => {
            const user = users.find(u => u._id.toString() === tutorProfile.user_id.toString());
            if (user) {
                tutorToUserMap[tutorProfile._id.toString()] = user;
            }
        });

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number,
                age: user.age,
                photo_url: user.photo_url,
                role: user.role
            },
            inquiries,
            tutors: users,
            tutorToUserMap, // Add this mapping
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        console.error("Error fetching student help requests:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching help requests",
            error: error.message
        });
    }
});

exports.hireTutor = asyncHandler(async (req, res) => {
    const { tutor_user_id, student_user_id, subject, academic_level_id } = req.body;

    // Find profiles
    const student = await Student.findOne({ user_id: student_user_id });
    const tutor = await TutorProfile.findOne({ user_id: tutor_user_id });

    if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
    }

    if (!tutor) {
        return res.status(404).json({ message: "Tutor profile not found" });
    }

    // Check if tutor is already hired and what the status is
    const existingHireIndex = student.hired_tutors.findIndex(
        (h) => {
            if (!h) return false;
            const tutorId = h.tutor ? h.tutor : h; // handle both object and raw ObjectId
            return tutorId.toString() === tutor._id.toString();
        }
    );

    if (existingHireIndex !== -1) {
        const existingHire = student.hired_tutors[existingHireIndex];

        // If the hire request is already accepted, show "already hired" message
        if (existingHire.status === "accepted") {
            return res.status(400).json({ message: "Tutor already hired. Select another tutor" });
        }

        // If there's a pending request, prevent duplicate
        if (existingHire.status === "pending") {
            return res.status(400).json({ message: "Hiring request already pending for this tutor" });
        }

        // If there's a rejected request, update it to pending instead of creating new one
        if (existingHire.status === "rejected") {
            // Update the existing rejected request to pending
            student.hired_tutors[existingHireIndex].status = "pending";
            student.hired_tutors[existingHireIndex].hired_at = new Date(); // Update timestamp
            if (subject) student.hired_tutors[existingHireIndex].subject = subject;
            // if (academic_level) student.hired_tutors[existingHireIndex].academic_level = academic_level;
            if (academic_level_id) student.hired_tutors[existingHireIndex].academic_level_id = academic_level_id;

            // Remove any other duplicate requests for this tutor to keep database clean
            student.hired_tutors = student.hired_tutors.filter((hire, index) => {
                if (index === existingHireIndex) return true; // Keep the updated one
                if (!hire || !hire.tutor) return false; // Remove invalid entries
                return hire.tutor.toString() !== tutor._id.toString(); // Remove other requests for this tutor
            });

            await student.save();

            return res.status(200).json({
                message: "Previous rejected request has been resubmitted successfully. The tutor will be notified."
            });
        }
    }

    // If no existing request, create a new one
    student.hired_tutors.push({
        tutor: tutor._id,
        subject: subject || "",
        // academic_level: academic_level || "",
        academic_level_id: academic_level_id || null,
        status: "pending", // Explicitly set status
        hired_at: new Date() // Explicitly set timestamp
    });

    await student.save();

    res.status(200).json({ message: "Tutor request sent successfully. The tutor will be notified and can accept or reject your request." });
});


exports.sendMessage = asyncHandler(async (req, res) => {
    const { tutorId, message } = req.body;
    const studentId = req.user._id; // logged-in student


    if (!tutorId || !message) {
        res.status(400);
        throw new Error("Tutor ID and message are required");
    }

    const tutor = await TutorProfile.findById(tutorId);
    if (!tutor) {
        res.status(404);
        throw new Error("Tutor not found");
    }

    const newMessage = await Message.create({
        studentId,
        tutorId: tutor.user_id,
        message,
        status: "unanswered",
    });

    res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: newMessage,
    });

});

exports.getAcceptedTutorsForStudent = async (req, res) => {
    try {
        // Step 1: Find the student document for the logged-in user
        const student = await Student.findOne({ user_id: req.user._id })
            .populate({
                path: "hired_tutors.tutor",
                model: "TutorProfile",
                populate: {
                    path: "user_id", // if TutorProfile has a user reference for name/email
                    select: "full_name email"
                }
            });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        // Step 2: Filter only accepted tutors
        const acceptedTutors = student.hired_tutors
            .filter(t => t.status === "accepted" && t.tutor !== null)
            .map(t => ({
                tutorId: t.tutor._id,
                full_name: t.tutor.user_id?.full_name || "Unknown",
                email: t.tutor.user_id?.email || "",
                subject: t.tutor.subject || "",
                hired_at: t.hired_at
            }));

        res.json({
            success: true,
            data: acceptedTutors
        });

    } catch (error) {
        console.error("Error fetching accepted tutors:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

exports.getStudentTutorChat = asyncHandler(async (req, res) => {
    const studentId = req.user._id; // logged-in student
    const { tutorId } = req.params;
    
    // Find tutor profile by ID
    const tutor = await TutorProfile.findById(tutorId);
    if (!tutor) {
        res.status(404);
        throw new Error("Tutor not found");
    }

    // Find messages between student and tutor
    const messages = await Message.find({ 
        studentId, 
        tutorId: tutor.user_id 
    })
    .populate("tutorId", "full_name photo_url") // Fixed populate syntax
    .sort({ createdAt: 1 }); // oldest first for proper chat order

    res.status(200).json({
        success: true,
        count: messages.length,
        data: messages,
    });

});

// Get hired tutors for student (for StudentHelpRequests component)
exports.getHiredTutors = asyncHandler(async (req, res) => {
    try {
        const studentId = req.user._id; // logged-in student

        // Find the student document
        const student = await Student.findOne({ user_id: studentId })
            .populate({
                path: "hired_tutors.tutor",
                model: "TutorProfile",
                populate: {
                    path: "user_id",
                    select: "full_name email photo_url"
                }
            });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        // Filter and format hired tutors
        const hiredTutors = student.hired_tutors
            .filter(hiredTutor => hiredTutor.tutor !== null) // Filter out any null tutors
            .map(hiredTutor => {
                const tutorProfile = hiredTutor.tutor;
                const user = tutorProfile.user_id;

                return {
                    _id: tutorProfile._id,
                    tutor_id: tutorProfile._id,
                    user_id: user,
                    full_name: user.full_name,
                    email: user.email,
                    photo_url: user.photo_url,
                    hireStatus: hiredTutor.status,
                    // status: hiredTutor.status || 'pending',
                    hired_at: hiredTutor.hired_at,
                    // Tutor profile information
                    subjects: tutorProfile.subjects || [],
                    location: tutorProfile.location,
                    experience: tutorProfile.experience_years,
                    rating: tutorProfile.average_rating,
                    hourly_rate: tutorProfile.hourly_rate,
                    bio: tutorProfile.bio,
                    qualifications: tutorProfile.qualifications,
                    academic_levels_taught: tutorProfile.academic_levels_taught
                };
            });

        res.status(200).json({
            success: true,
            tutors: hiredTutors,
            total: hiredTutors.length
        });

    } catch (error) {
        console.error("Error fetching hired tutors:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch hired tutors",
            error: error.message
        });
    }
});

// Student rates a session (per-student rating)
exports.rateSession = asyncHandler(async (req, res) => {
    const { session_id } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
    }

    // Resolve current student's profile
    const studentUserId = req.user._id;
    const studentProfile = await Student.findOne({ user_id: studentUserId }).select('_id');
    if (!studentProfile) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const session = await TutoringSession.findById(session_id);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Must belong to this session
    const inSession = (session.student_ids || []).some(id => id.toString() === studentProfile._id.toString());
    if (!inSession) {
        return res.status(403).json({ success: false, message: 'You are not part of this session' });
    }

    // Declined students cannot rate
    const myResp = (session.student_responses || []).find(r => r.student_id.toString() === studentProfile._id.toString());
    if (myResp && myResp.status === 'declined') {
        return res.status(403).json({ success: false, message: 'You declined this session and cannot rate it' });
    }

    // Upsert per-student rating
    const ratings = Array.isArray(session.student_ratings) ? [...session.student_ratings] : [];
    const idx = ratings.findIndex(r => r.student_id.toString() === studentProfile._id.toString());
    const entry = { student_id: studentProfile._id, rating: Number(rating), feedback: feedback || '', rated_at: new Date() };
    if (idx === -1) ratings.push(entry); else ratings[idx] = entry;

    // Save per-student ratings
    session.student_ratings = ratings;
    // Recompute overall session rating and persist in session.rating
    const sum = ratings.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    const avg = ratings.length > 0 ? sum / ratings.length : undefined;
    if (typeof avg === 'number' && Number.isFinite(avg)) {
        session.rating = Math.round(avg * 10) / 10; // 1 decimal
    } else {
        session.rating = undefined;
    }
    await session.save();

    // Recompute tutor average from session.rating across completed sessions
    const ratingsAgg = await TutoringSession.aggregate([
        { $match: { tutor_id: session.tutor_id, status: { $in: ['completed', 'in_progress'] }, rating: { $exists: true } } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    // const avgRating = ratingsAgg[0]?.average || 0;
    const totalSessions = ratingsAgg[0]?.count || 0;
    await TutorProfile.findOneAndUpdate(
        { _id: session.tutor_id },
        {total_sessions: totalSessions },
        { new: true }
    );

    return res.status(200).json({ success: true, message: 'Rating submitted', session });
});

// Get student payments
exports.getStudentPayments = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Verify the user is requesting their own data
    if (req.user._id.toString() !== userId) {
        res.status(403);
        throw new Error('Unauthorized access');
    }
    try {
        // Get student profile
        const studentProfile = await Student.findOne({ user_id: userId });
        if (!studentProfile) {
            res.status(404);
            throw new Error('Student profile not found');
        }

        // Get all payments for this student
        const payments = await StudentPayment.find({
            student_id: studentProfile._id
        }).populate([
            {
                path: 'tutor_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name photo_url'
                }
            },
            {
                path: 'subject',
                select: 'name'
            },
            {
                path: 'academic_level',
                select: 'level'
            }
        ]);

        // Get all renewal payments to check which payments have been renewed
        const renewalPayments = await StudentPayment.find({
            is_renewal: true,
            original_payment_id: { $in: payments.map(p => p._id) }
        });

        // Create a map of original payment IDs that have renewals
        const hasRenewalMap = {};
        renewalPayments.forEach(renewal => {
            hasRenewalMap[renewal.original_payment_id.toString()] = true;
        });

        // Transform payments into frontend format
        const formattedPayments = payments.map(payment => {
            const tutorName = payment.tutor_id?.user_id?.full_name || 'Unknown Tutor';
            const tutorPhotoUrl = payment.tutor_id?.user_id?.photo_url || '';
            const subject = payment.subject?.name || 'Unknown Subject';
            const academicLevel = payment.academic_level?.level || 'Unknown Level';

            // Map payment status to frontend status
            let status = 'pending';
            if (payment.payment_status === 'paid') {
                status = 'completed';
            } else if (payment.payment_status === 'failed') {
                status = 'failed';
            } else if (payment.payment_status === 'cancelled') {
                status = 'cancelled';
            }

            // Calculate validity and session info
            const now = new Date();
            const validityEndDate = new Date(payment.validity_end_date);
            const daysRemaining = Math.ceil((validityEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isValid = payment.isValid ? payment.isValid() : false;
            const paymentStatus = payment.getPaymentStatus ? payment.getPaymentStatus() : 'pending';

            return {
                _id: payment._id,
                tutor_name: tutorName,
                subject: subject,
                academic_level: academicLevel,
                tutor_photo_url: tutorPhotoUrl,
                // Payment Details
                payment_type: payment.payment_type,
                base_amount: payment.base_amount,
                discount_percentage: payment.discount_percentage,
                discount_amount: payment.discount_amount,
                final_amount: payment.final_amount,

                // Package Details
                monthly_amount: payment.monthly_amount,
                total_sessions_per_month: payment.total_sessions_per_month,
                max_sessions_per_month: payment.max_sessions_per_month,

                // Validity and Sessions
                validity_start_date: payment.validity_start_date,
                validity_end_date: payment.validity_end_date,
                total_sessions_allowed: payment.total_sessions_allowed,
                sessions_used: payment.sessions_used,
                sessions_remaining: payment.sessions_remaining,
                days_remaining: Math.max(0, daysRemaining),
                is_valid: isValid,

                // Status and Dates
                status: status,
                validity_status: paymentStatus,
                created_at: payment.request_date,
                payment_date: payment.payment_date,
                notes: payment.request_notes,
                payment_id: payment._id,
                academic_level_paid: payment.academic_level_paid,

                // Additional Info
                currency: payment.currency || 'GBP',
                
                // Renewal tracking
                is_renewal: payment.is_renewal || false,
                original_payment_id: payment.original_payment_id || null,
                has_renewal: hasRenewalMap[payment._id.toString()] || false
            };
        });

        res.status(200).json({
            success: true,
            payments: formattedPayments
        });

    } catch (error) {
        console.error('Error fetching student payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments',
            error: error.message
        });
    }
});

// Process student payment
exports.processStudentPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    try {
        // Find the payment record
        const payment = await StudentPayment.findById(paymentId);
        if (!payment) {
            res.status(404);
            throw new Error('Payment record not found');
        }

        // Verify the user owns this payment
        const studentProfile = await Student.findOne({ user_id: req.user._id });
        if (!studentProfile) {
            res.status(404);
            throw new Error('Student profile not found');
        }

        if (payment.student_id.toString() !== studentProfile._id.toString()) {
            res.status(403);
            throw new Error('Unauthorized access to this payment');
        }

        // Check if payment is already processed
        if (payment.payment_status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment already processed for this academic level'
            });
        }

        // Update payment status and academic level access
        payment.payment_status = 'paid';
        payment.payment_date = new Date();
        payment.academic_level_paid = true; // Now tutor can create sessions for this academic level
        payment.validity_status = 'active'; // Set payment as active

        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully. Tutor can now create sessions for this academic level.',
            payment: {
                _id: payment._id,
                payment_status: payment.payment_status,
                payment_date: payment.payment_date,
                academic_level_paid: payment.academic_level_paid
            }
        });

    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message
        });
    }
});

// Note: Payment records are now automatically created in tutorController.js when tutor accepts hire request

// Create new payment for expired payment renewal
exports.createRenewalPayment = asyncHandler(async (req, res) => {
    const { expiredPaymentId } = req.params;
    const { validity_start_date, validity_end_date } = req.body;

    try {
        // Find the expired payment
        const expiredPayment = await StudentPayment.findById(expiredPaymentId);
        if (!expiredPayment) {
            res.status(404);
            throw new Error('Expired payment not found');
        }

        // Verify the user owns this payment
        const studentProfile = await Student.findOne({ user_id: req.user._id });
        if (!studentProfile) {
            res.status(404);
            throw new Error('Student profile not found');
        }

        if (expiredPayment.student_id.toString() !== studentProfile._id.toString()) {
            res.status(403);
            throw new Error('Unauthorized access to this payment');
        }

        // Check if payment is actually expired
        if (expiredPayment.validity_status !== 'expired') {
            return res.status(400).json({
                success: false,
                message: 'Payment is not expired'
            });
        }
        const subjectData = await Subject.findById(expiredPayment.subject);
        const academicLevelData = await EducationLevel.findById(
          expiredPayment.academic_level
        );
        // Create new payment record based on expired one
        const newPayment = await StudentPayment.create({
            student_id: expiredPayment.student_id,
            tutor_id: expiredPayment.tutor_id,
            subject: expiredPayment.subject,
            academic_level: expiredPayment.academic_level,
            payment_type: expiredPayment.payment_type,
            base_amount: expiredPayment.base_amount,
            discount_percentage: expiredPayment.discount_percentage,
            monthly_amount: expiredPayment.monthly_amount,
            total_sessions_per_month: expiredPayment.total_sessions_per_month,
            validity_start_date: validity_start_date || new Date(),
            validity_end_date: validity_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            sessions_remaining: expiredPayment.total_sessions_per_month,
            payment_status: 'pending',
            validity_status: 'pending',
            request_notes: `Renewal of payment for Monthly package for ${ subjectData?.name || "Subject"
            } - ${academicLevelData?.level || "Level"
            }. ${expiredPayment.total_sessions_per_month} sessions per month.`,
            currency: expiredPayment.currency,
            is_renewal: true,
            original_payment_id: expiredPayment._id
        });
       
        res.status(201).json({
            success: true,
            message: 'Renewal payment created successfully',
            payment: {
                _id: newPayment._id,
                payment_status: newPayment.payment_status,
                validity_status: newPayment.validity_status,
                validity_start_date: newPayment.validity_start_date,
                validity_end_date: newPayment.validity_end_date
            }
        });

    } catch (error) {
        console.error('Error creating renewal payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create renewal payment',
            error: error.message
        });
    }
});

// Check payment status for all accepted hire requests
exports.checkStudentPaymentStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    try {
        // Get student profile
        const studentProfile = await Student.findOne({ user_id: userId });
        if (!studentProfile) {
            res.status(404);
            throw new Error('Student profile not found');
        }

        // Get all accepted hire requests for this student
        const acceptedHireRequests = studentProfile.hired_tutors?.filter(hire => hire.status === 'accepted') || [];

        const paymentStatuses = [];
        let hasUnpaidRequests = false;

        for (const hireRequest of acceptedHireRequests) {
            // Check if payment exists for this hire request
            const payment = await StudentPayment.findOne({
                student_id: studentProfile._id,
                tutor_id: hireRequest.tutor,
                subject: hireRequest.subject,
                academic_level: hireRequest.academic_level_id,
                payment_status: 'paid',
                validity_status: 'active'
            });

            // Get tutor, subject, and academic level details
            const tutor = await TutorProfile.findById(hireRequest.tutor).populate('user_id', 'full_name');


            const isPaid = !!payment;
            if (!isPaid) {
                hasUnpaidRequests = true;
            }

            paymentStatuses.push({
                tutor_id: hireRequest.tutor,
                tutor_name: tutor?.user_id?.full_name || 'Unknown Tutor',
                subject_id: hireRequest.subject,
                subject_name: hireRequest.subject,
                academic_level_name: hireRequest.academic_level_id,
                is_paid: isPaid,
                payment_details: payment ? {
                    payment_type: payment.payment_type,
                    final_amount: payment.monthly_amount,
                    sessions_remaining: payment.total_sessions_per_month,
                    validity_end_date: payment.validity_end_date,
                    validity_status: payment.validity_status
                } : null,

            });
        }

        res.status(200).json({
            success: true,
            has_unpaid_requests: hasUnpaidRequests,
            total_accepted_requests: acceptedHireRequests.length,
            total_paid_requests: paymentStatuses.filter(p => p.is_paid).length,
            total_unpaid_requests: paymentStatuses.filter(p => !p.is_paid).length,
            payment_statuses: paymentStatuses
        });

    } catch (error) {
        console.error('Error checking student payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check payment status',
            error: error.message
        });
    }
});

