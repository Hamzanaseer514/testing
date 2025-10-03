const asyncHandler = require("express-async-handler");
const User = require("../Models/userSchema");
const Student = require("../Models/studentProfileSchema");
const ParentProfile = require("../Models/ParentProfileSchema");
const mongoose = require("mongoose");
const TutoringSession = require("../Models/tutoringSessionSchema");
const StudentPayment = require("../Models/studentPaymentSchema");
const TutorProfile = require("../Models/tutorProfileSchema");
const TutorInquiry = require("../Models/tutorInquirySchema");
const TutorReview = require("../Models/tutorReviewSchema");

const {

  EducationLevel,

  Subject,

  SubjectType,

} = require("../Models/LookupSchema");

exports.addStudentToParent = asyncHandler(async (req, res) => {
  const {
    parent_user_id,
    full_name,
    email,
    password,
    age,
    photo_url,
    academic_level,
  } = req.body;

  if (!parent_user_id || !email || !password || !full_name || !academic_level || !age) {
    res.status(400);
    throw new Error("Missing required student fields");
  }

  // ✅ Only allow children < 12
  if (age >= 12) {
    res.status(400);
    throw new Error("Only children under 12 can be added by parents. Children 12 and older must register themselves.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Student email already exists");
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
    );
  }

  try {
    // Create student as a user
    const studentUser = await User.create({
      full_name,
      email,
      password,
      age,
      role: "student",
      photo_url,
      is_verified: "active",
    });

    // ✅ Get parent profile first (so we can store its ID)
    const parentProfile = await ParentProfile.findOne({ user_id: parent_user_id });
    if (!parentProfile) {
      throw new Error("Parent profile not found");
    }

    // ✅ Create student profile linked to parent
    const studentProfile = await Student.create({
      user_id: studentUser._id,
      academic_level: academic_level, // ObjectId of EducationLevel
      parent_id: parentProfile._id,   // 👈 save parent_id in student profile
    });

    // ✅ Add student into parent’s students array
    parentProfile.students.push(studentProfile._id);
    await parentProfile.save();

    res.status(201).json({
      message: "Student added to parent successfully",
      studentUser,
      studentProfile,
      parentProfile,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to add student: " + error.message);
  }
});


exports.getParentProfile = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  try {
    // Fetch parent profile with parent user info and nested student info
    const parentProfile = await ParentProfile.findOne({ user_id })
      .populate({
        path: "user_id", // populate parent's own user info
        select: "full_name email age  phone_number photo_url is_verified created_at updatedAt"
      })
      .populate({
        path: "students",
        populate: [
          { path: "user_id", select: "full_name email phone_number age photo_url is_verified created_at" },
          { path: "academic_level", select: "level" }
        ]
      });

    if (!parentProfile) {
      res.status(404);
      throw new Error("Parent profile not found");
    }

    // Transform student info
    const childrenWithUserInfo = parentProfile.students.map(child => ({
      _id: child.user_id._id,
      full_name: child.user_id.full_name,
      email: child.user_id.email,
      phone_number: child.user_id.phone_number,
      age: child.user_id.age,
      photo_url: child.user_id.photo_url,
      is_verified: child.user_id.is_verified,
      created_at: child.user_id.created_at,
      academic_level: child.academic_level,
      preferred_subjects: child.preferred_subjects,
    }));

    res.status(200).json({
      parentProfile,
      children: childrenWithUserInfo
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch parent profile: " + error.message);
  }
});

exports.updateParentProfile = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const updateData = req.body;
  console.log("Update data:", updateData);
  try {
    const user = await User.findByIdAndUpdate(
      user_id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404);
      throw new Error("Parent not found");
    }

    res.status(200).json({
      message: "Parent profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to update parent profile: " + error.message);
  }
});

exports.getParentDashboardStats = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  try {
    const parentProfile = await ParentProfile.findOne({ user_id });

    if (!parentProfile) {
      res.status(404);
      throw new Error("Parent profile not found");
    }

    // Fetch all students with their user info
    const students = await Student.find({ _id: { $in: parentProfile.students } })
      .populate("user_id", "is_verified");

    const totalChildren = students.length;

    // Count active/inactive by checking populated user_id.is_verified
    const activeChildren = students.filter(s => s.user_id?.is_verified === "active").length;
    const inactiveChildren = totalChildren - activeChildren;

    res.status(200).json({
      totalChildren,
      activeChildren,
      inactiveChildren
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch parent dashboard stats: " + error.message);
  }
});

exports.getSpecificStudentDetail = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the student profile with all related information
    const studentProfile = await Student.findOne({ user_id: userId })
      .populate({
        path: "user_id",
        select: "full_name email phone_number age photo_url is_verified created_at"
      })
      .populate({
        path: "academic_level",
        select: "level"
      })
      .populate({
        path: "preferred_subjects",
        select: "name"
      })
      .populate({
        path: "hired_tutors.tutor",
        populate: {
          path: "user_id",
          select: "full_name email photo_url"
        },
        select: "average_rating academic_levels_taught"
      })
      .populate({
        path: "hired_tutors.subject",
        select: "name"
      })
      .populate({
        path: "hired_tutors.academic_level_id",
        select: "level"
      });

    if (!studentProfile) {
      res.status(404);
      throw new Error("Student profile not found");
    }
    const Session = await TutoringSession.find({ student_ids: studentProfile._id });
    const totalSessions = Session.length;
    const completedSessions = Session.filter(session => session.status === "completed").length;
    const pendingSessions = Session.filter(session => session.status === "pending").length;
    const upcomingSessions = Session.filter(session => session.status === "confirmed").length;
    const cancelledSessions = Session.filter(session => session.status === "cancelled").length;
    // Transform the data for better frontend consumption
    const transformedStudent = {
      _id: studentProfile.user_id._id,
      full_name: studentProfile.user_id.full_name,
      email: studentProfile.user_id.email,
      phone_number: studentProfile.user_id.phone_number,
      age: studentProfile.user_id.age,
      photo_url: studentProfile.user_id.photo_url,
      is_verified: studentProfile.user_id.is_verified,
      created_at: studentProfile.user_id.created_at,
      academic_level: studentProfile.academic_level,
      preferred_subjects: studentProfile.preferred_subjects,
      learning_goals: studentProfile.learning_goals,
      availability: studentProfile.availability,
      totalSessions,
      completedSessions,
      pendingSessions,
      upcomingSessions,
      cancelledSessions,
      hired_tutors: studentProfile.hired_tutors.map(tutor => {
        // find correct hourly rate for the hired academic level
        let hourlyRate = null;
        if (tutor.tutor && tutor.academic_level_id) {
          const match = tutor.tutor.academic_levels_taught.find(
            lvl => lvl.educationLevel?.toString() === tutor.academic_level_id._id.toString()
          );
          hourlyRate = match ? match.hourlyRate : null;
        }

        return {
          _id: tutor._id,
          tutor: {
            _id: tutor.tutor?._id,
            user_id: tutor.tutor?.user_id?._id,
            full_name: tutor.tutor?.user_id?.full_name,
            email: tutor.tutor?.user_id?.email,
            photo_url: tutor.tutor?.user_id?.photo_url,
            hourly_rate: hourlyRate, // ✅ Correct hourlyRate from academic_levels_taught
            rating: tutor.tutor?.average_rating
          },
          subject: tutor.subject
            ? {
              _id: tutor.subject._id,
              name: tutor.subject.name
            }
            : null,
          academic_level: tutor.academic_level_id
            ? {
              _id: tutor.academic_level_id._id,
              level: tutor.academic_level_id.level
            }
            : null,
          status: tutor.status,
          hired_at: tutor.hired_at,
          createdAt: tutor.createdAt,
          updatedAt: tutor.updatedAt,
        };
      }),
    };


    res.status(200).json({
      success: true,
      student: transformedStudent
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch student details: " + error.message);
  }
});

exports.getParentStudentsPayments = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  try {
    // First get the parent profile to find all students
    const parentProfile = await ParentProfile.findOne({ user_id })
      .populate({
        path: 'students',
        populate: [
          { path: 'user_id', select: 'full_name email photo_url' },
          { path: 'academic_level', select: 'level' },
          { path: 'preferred_subjects', select: 'name' }
        ]
      });

    if (!parentProfile) {
      res.status(404);
      throw new Error("Parent profile not found");
    }

    // Get all payment records for the parent's students
    const studentIds = parentProfile.students.map(student => student._id);

    const payments = await StudentPayment.find({
      student_id: { $in: studentIds }
    })
      .populate([
        {
          path: 'student_id',
          populate: {
            path: 'user_id',
            select: 'full_name email photo_url'
          }
        },
        {
          path: 'tutor_id',
          populate: {
            path: 'user_id',
            select: 'full_name email photo_url'
          },
          select: 'average_rating academic_levels_taught'
        },
        { path: 'subject', select: 'name' },
        { path: 'academic_level', select: 'level' }
      ])
      .sort({ request_date: -1 }); // Most recent first

    // Transform the data to include student names and other details
    const transformedPayments = payments.map(payment => ({
      _id: payment._id,
      student: payment.student_id?.user_id,
      tutor: payment.tutor_id,
      subject: payment.subject,
      academic_level: payment.academic_level,
      payment_type: payment.payment_type,
      base_amount: payment.base_amount,
      monthly_amount: payment.monthly_amount,
      discount_percentage: payment.discount_percentage,
      total_sessions_per_month: payment.total_sessions_per_month,
      validity_start_date: payment.validity_start_date,
      validity_end_date: payment.validity_end_date,
      sessions_remaining: payment.sessions_remaining,
      payment_status: payment.payment_status,
      validity_status: payment.validity_status,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      request_date: payment.request_date,
      request_notes: payment.request_notes,
      academic_level_paid: payment.academic_level_paid,
      is_active: payment.is_active,
      currency: payment.currency,
      gateway_transaction_id: payment.gateway_transaction_id,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      
      // Renewal tracking
      is_renewal: payment.is_renewal || false,
      original_payment_id: payment.original_payment_id || null
    }));

    res.status(200).json({
      success: true,
      payments: transformedPayments,
      total: transformedPayments.length
    });

  } catch (error) {
    console.error("Error fetching parent students payments:", error);
    res.status(500);
    throw new Error("Failed to fetch payments data");
  }
});


exports.getParentStudentSessions = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { status, page = 1, limit = 10 } = req.query;


  const parentProfile = await ParentProfile.findOne({ user_id: user_id });
  if (!parentProfile) {
    res.status(404);
    throw new Error('Parent profile not found');
  }
  // Get all students associated with this parent
  const students = await Student.find({ _id: { $in: parentProfile.students } });
  if (!students || students.length === 0) {
    res.status(404);
    throw new Error('No students found for this parent');
  }
  // Get student IDs for querying sessions
  const studentIds = students.map(student => student._id);
  const query = { student_ids: { $in: studentIds } };
  if (status && status !== 'all') {
    query.status = status;
  }

  const sessions = await TutoringSession.find(query)
    .populate({
      path: "tutor_id",
      select: "user_id qualifications average_rating total_sessions experience_years bio location phone_number",
      populate: {
        path: "user_id",
        select: "full_name email photo_url",
      },
    })
    .populate({
      path: 'student_ids',
      select: "user_id",
      populate: {
        path: "user_id",
        select: "full_name email",
      },
    })
    .populate({
      path: 'student_responses.student_id',
      select: 'user_id',
      populate: { path: 'user_id', select: 'full_name email' }
    })
    .populate({
      path: 'student_ratings.student_id',
      select: 'user_id',
      populate: { path: 'user_id', select: 'full_name email' }
    })
    .sort({ session_date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // 🔑 Check payments for each tutor-session
  const enrichedSessions = await Promise.all(sessions.map(async (session) => {
    // Check if any of the students in this session have paid for this tutor
    const hasPayment = await StudentPayment.exists({
      student_id: { $in: studentIds },
      tutor_id: session.tutor_id._id,
      payment_status: 'paid',
      validity_status: 'active',
      is_active: true
    });

    return {
      ...session.toObject(),
      payment_required: !hasPayment, // agar kisi bhi student ka payment nhi hai to true
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

exports.deleteChildFromParent = asyncHandler(async (req, res) => {
  const { childId } = req.params;
  const { parentUserId } = req.body;
  if (!childId || !parentUserId) {
    res.status(400);
    throw new Error("Child ID and Parent User ID are required");
  }

  try {
    // Start a database session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // First, verify the child exists and belongs to the parent
      const parentProfile = await ParentProfile.findOne({ user_id: parentUserId }).session(session);

      if (!parentProfile) {
        res.status(404);
        throw new Error("Parent profile not found");
      }

      // Find the student profile by user_id (not by _id)
      const studentProfile = await Student.findOne({ user_id: childId }).session(session);

      if (!studentProfile) {
        res.status(404);
        throw new Error("Child profile not found");
      }

      // Check if the child belongs to this parent
      const childBelongsToParent = parentProfile.students.includes(studentProfile._id);
      if (!childBelongsToParent) {
        res.status(403);
        throw new Error("This child does not belong to the specified parent");
      }

      // Check if child has any active sessions or payments
      const activeSessions = await TutoringSession.find({
        student_ids: studentProfile._id,
        status: { $in: ['confirmed', 'pending'] }
      }).session(session);

      if (activeSessions.length > 0) {
        res.status(400);
        throw new Error("Cannot delete child with active or pending sessions. Please cancel all sessions first.");
      }

      const activePayments = await StudentPayment.find({
        student_id: studentProfile._id,
        payment_status: 'paid',
        is_active: true
      }).session(session);

      if (activePayments.length > 0) {
        res.status(400);
        throw new Error("Cannot delete child with active payments. Please wait for payments to expire or contact support.");
      }

      // Remove child from parent's students array
      await ParentProfile.findByIdAndUpdate(
        parentProfile._id,
        { $pull: { students: studentProfile._id } },
        { session }
      );

      // Delete the student profile
      await Student.findByIdAndDelete(studentProfile._id).session(session);

      // Delete the user account
      await User.findByIdAndDelete(studentProfile.user_id).session(session);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: "Child deleted successfully",
        deletedChildId: childId
      });

    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error("Error deleting child:", error);
    res.status(500);
    throw new Error("Failed to delete child: " + error.message);
  }
});


exports.searchTutors = asyncHandler(async (req, res) => {
  const {
    search,
    subject_id,
    academic_level,
    location,
    min_rating,
    preferred_subjects_only,
    page = 1,
    limit = 10
  } = req.query;

  try {
    const query = {
      profile_status: 'approved', // Only approved tutors
    };

    // ✅ Subject filter (direct subject_id from query)
    if (subject_id && subject_id.match(/^[0-9a-fA-F]{24}$/)) {
      query.subjects = { $in: [subject_id] };
    }

    // ✅ Academic level filter
    if (academic_level && academic_level.match(/^[0-9a-fA-F]{24}$/)) {
      query['academic_levels_taught.educationLevel'] = academic_level;
    }

    // ✅ Location filter
    if (location) {
      query.location = new RegExp(location, 'i');
    }

    // ✅ Rating filter
    if (min_rating) {
      query.average_rating = { $gte: parseFloat(min_rating) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let searchQuery = { ...query };

    // ==============================
    // 🔍 Handle free-text search
    // ==============================
    if (search) {
      // 1. Find tutors whose name matches
      const matchingUsers = await User.find({
        full_name: { $regex: search, $options: 'i' },
        role: 'tutor'
      }).select('_id');

      const userIds = matchingUsers.map(user => user._id);

      // 2. Find subjects whose name matches
      const matchingSubjects = await Subject.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');

      const subjectIds = matchingSubjects.map(subj => subj._id);

      // 3. Build OR conditions
      const searchOrConditions = [];
      if (userIds.length) {
        searchOrConditions.push({ user_id: { $in: userIds } });
      }
      if (subjectIds.length) {
        searchOrConditions.push({ subjects: { $in: subjectIds } });
      }

      if (searchOrConditions.length > 0) {
        searchQuery = {
          ...query,
          $or: searchOrConditions
        };
      }
    }

    // Ensure subject_id filter isn't lost
    if (subject_id && !searchQuery.subjects) {
      searchQuery.subjects = { $in: [subject_id] };
    }

    // ==============================
    // 📌 Fetch Tutors
    // ==============================
    const tutors = await TutorProfile.find({ ...searchQuery, profile_status: 'approved' })
      .populate('user_id', 'full_name email photo_url')
      .populate('subjects', 'name') // ✅ populate subjects for frontend
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ average_rating: -1 })
      .lean();

    // Collect academic level IDs
    const tutorAcademicLevelIds = tutors.flatMap(tutor =>
      (tutor.academic_levels_taught || []).map(level => level.educationLevel)
    );

    // Fetch sessions for reviews + student counts
    const allSessions = await TutoringSession.find({
      tutor_id: { $in: tutors.map(tutor => tutor._id) }
    }).select('tutor_id student_ids status rating feedback student_ratings');

    // Map tutor -> reviews
    const tutorReviewsMap = {};
    allSessions.forEach(session => {
      const tutorId = session.tutor_id.toString();
      if (!tutorReviewsMap[tutorId]) tutorReviewsMap[tutorId] = [];
      tutorReviewsMap[tutorId].push({
        rating: session.rating,
        feedback: session.feedback,
        student_ratings: session.student_ratings
      });
    });

    // Map tutor -> unique student count
    const tutorStudentCountMap = {};
    allSessions.forEach(session => {
      const tutorId = session.tutor_id.toString();
      if (!tutorStudentCountMap[tutorId]) {
        tutorStudentCountMap[tutorId] = new Set();
      }
      if (session.student_ids?.length) {
        session.student_ids.forEach(sid => tutorStudentCountMap[tutorId].add(sid.toString()));
      }
    });

    // ==============================
    // 📌 Inquiry Stats
    // ==============================
    const allInquiries = await TutorInquiry.find({
      tutor_id: { $in: tutors.map(t => t._id) }
    }).select('tutor_id status replied_at createdAt');
    const tutorInquiryStatsMap = {};
    allInquiries.forEach(inquiry => {
      const tId = inquiry.tutor_id.toString();
      if (!tutorInquiryStatsMap[tId]) {
        tutorInquiryStatsMap[tId] = {
          total_received: 0,
          total_replied: 0,
          response_times: [],
          by_status: {}
        };
      }

      tutorInquiryStatsMap[tId].total_received += 1;
      tutorInquiryStatsMap[tId].by_status[inquiry.status] =
        (tutorInquiryStatsMap[tId].by_status[inquiry.status] || 0) + 1;

      if (inquiry.status === "replied" && inquiry.replied_at) {
        tutorInquiryStatsMap[tId].total_replied += 1;

        const responseTime =
          new Date(inquiry.replied_at).getTime() -
          new Date(inquiry.createdAt).getTime();

        tutorInquiryStatsMap[tId].response_times.push(responseTime);
      }
    });

    // Fetch education levels
    const academicLevels = await EducationLevel.find({ _id: { $in: tutorAcademicLevelIds } });
    const academicLevelMap = {};
    academicLevels.forEach(level => {
      academicLevelMap[level._id.toString()] = level;
    });

    // Count total tutors
    const total = await TutorProfile.countDocuments({ ...searchQuery, profile_status: 'approved' });

    // ==============================
    // 🎯 Format Tutors for Response
    // ==============================
    const formattedTutors = tutors
      .filter(tutor => tutor.user_id) // remove broken profiles
      .map(tutor => {
        const tId = tutor._id.toString();

        const tutorAcademicLevels = (tutor.academic_levels_taught || []).map(levelObj => {
          const levelDoc = academicLevelMap[levelObj.educationLevel?.toString()];
          return {
            name: levelDoc ? levelDoc.level : levelObj.name || 'Unknown',
            hourlyRate: levelObj.hourlyRate || (levelDoc ? levelDoc.hourlyRate : 0)
          };
        });

        const tutorHourlyRates = tutorAcademicLevels.map(level => level.hourlyRate).filter(r => r > 0);
        const min_hourly_rate_value = tutorHourlyRates.length ? Math.min(...tutorHourlyRates) : 0;
        const max_hourly_rate_value = tutorHourlyRates.length ? Math.max(...tutorHourlyRates) : 0;

        // Inquiry stats
        const stats = tutorInquiryStatsMap[tId] || {
          total_received: 0,
          total_replied: 0,
          response_times: [],
          by_status: {}
        };

      const avgResponse =
  stats.response_times.length > 0
    ? Math.ceil(
        (stats.response_times.reduce((a, b) => a + b, 0) / stats.response_times.length) / 60000
      )
    : null;


        const fastestResponse = stats.response_times.length
          ? Math.ceil(Math.min(...stats.response_times) / 60000)
          : null;

        console.log("stats", stats)
        console.log("fast", fastestResponse)
        const replyRate =
          stats.total_received > 0
            ? (stats.total_replied / stats.total_received) * 100
            : 0;

        return {
          _id: tutor._id,
          user_id: tutor.user_id,
          subjects: tutor.subjects, // now populated with subject names
          academic_levels_taught: tutor.academic_levels_taught,
          min_hourly_rate: min_hourly_rate_value,
          max_hourly_rate: max_hourly_rate_value,
          average_rating: tutor.average_rating,
          total_sessions: tutor.total_sessions || 0,
          total_students_taught: tutorStudentCountMap[tId]?.size || 0,
          location: tutor.location,
          bio: tutor.bio,
          qualifications: tutor.qualifications,
          experience_years: tutor.experience_years,
          is_verified: tutor.is_verified,
          is_approved: tutor.is_approved,
          reviews: tutorReviewsMap[tId] || [],
          // 🔹 Inquiry statistics
          inquiry_stats: {
            average_response_time: avgResponse ? `${avgResponse} min` : "N/A",
            fastest_response_time: fastestResponse ? `${fastestResponse} min` : "N/A",
            total_received: stats.total_received,
            total_replied: stats.total_replied,
            reply_rate: replyRate.toFixed(1),
            by_status: stats.by_status
          }
        };
      });

    // ==============================
    // 📤 Send Response
    // ==============================
    res.status(200).json({
      tutors: formattedTutors,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_tutors: total,
        has_next: skip + parseInt(limit) < total,
        has_prev: parseInt(page) > 1
      }
    });

  } catch (error) {
    res.status(500);
    throw new Error("Failed to search tutors: " + error.message);
  }
});

// Get tutors hired by parent's children
exports.getParentHiredTutors = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  try {
    // Get parent profile
    const parentProfile = await ParentProfile.findOne({ user_id })
      .populate({
        path: 'students',
        populate: {
          path: 'hired_tutors.tutor',
          populate: {
            path: 'user_id',
            select: 'full_name email photo_url'
          }
        }
      });

    if (!parentProfile) {
      res.status(404);
      throw new Error("Parent profile not found");
    }

    // Collect all unique tutors hired by children
    const hiredTutorsMap = new Map();
    
    parentProfile.students.forEach(student => {
      if (student.hired_tutors && student.hired_tutors.length > 0) {
        student.hired_tutors.forEach(hiredTutor => {
          if (hiredTutor.tutor && hiredTutor.status === 'accepted') {
            const tutorId = hiredTutor.tutor._id.toString();
            
            if (!hiredTutorsMap.has(tutorId)) {
              hiredTutorsMap.set(tutorId, {
                tutor: hiredTutor.tutor,
                hired_by_students: [],
                subjects: new Set(),
                academic_levels: new Set()
              });
            }
            
            const tutorData = hiredTutorsMap.get(tutorId);
            tutorData.hired_by_students.push({
              student_id: student._id,
              student_name: student.user_id?.full_name || 'Unknown',
              subject: hiredTutor.subject,
              academic_level: hiredTutor.academic_level_id,
              hired_at: hiredTutor.hired_at,
              status: hiredTutor.status
            });
            
            if (hiredTutor.subject) {
              tutorData.subjects.add(hiredTutor.subject);
            }
            if (hiredTutor.academic_level_id) {
              tutorData.academic_levels.add(hiredTutor.academic_level_id);
            }
          }
        });
      }
    });

    // Convert map to array and populate additional data
    const hiredTutors = Array.from(hiredTutorsMap.values()).map(tutorData => {
      const tutor = tutorData.tutor;
      
      return {
        _id: tutor._id,
        user_id: tutor.user_id,
        full_name: tutor.user_id?.full_name,
        email: tutor.user_id?.email,
        photo_url: tutor.user_id?.photo_url,
        location: tutor.location,
        bio: tutor.bio,
        qualifications: tutor.qualifications,
        experience_years: tutor.experience_years,
        average_rating: tutor.average_rating,
        total_sessions: tutor.total_sessions || 0,
        subjects: Array.from(tutorData.subjects),
        academic_levels: Array.from(tutorData.academic_levels),
        hired_by_students: tutorData.hired_by_students,
        total_children_hired: tutorData.hired_by_students.length
      };
    });

    res.status(200).json({
      success: true,
      tutors: hiredTutors,
      total: hiredTutors.length
    });

  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch hired tutors: " + error.message);
  }
});

// Submit parent review for tutor
exports.submitParentReview = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { tutor_id, rating, review_text } = req.body;

  if (!tutor_id || !rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Invalid review data");
  }

  try {
    // Get parent profile
    const parentProfile = await ParentProfile.findOne({ user_id });
    if (!parentProfile) {
      res.status(404);
      throw new Error("Parent profile not found");
    }

    // Check if parent has already reviewed this tutor
    const existingReview = await TutorReview.findOne({
      parent_id: parentProfile._id,
      tutor_id: tutor_id
    });

    if (existingReview) {
      res.status(400);
      throw new Error("You have already reviewed this tutor");
    }

    // Verify that parent's children have hired this tutor
    const hasHiredTutor = await Student.findOne({
      parent_id: parentProfile._id,
      'hired_tutors.tutor': tutor_id,
      'hired_tutors.status': 'accepted'
    });

    if (!hasHiredTutor) {
      res.status(403);
      throw new Error("You can only review tutors hired by your children");
    }

    // Create new review
    const review = await TutorReview.create({
      parent_id: parentProfile._id,
      tutor_id: tutor_id,
      rating: rating,
      review_text: review_text || '',
      review_type: 'parent'
    });

    // Update tutor's average rating
    await updateTutorAverageRating(tutor_id);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: review
    });

  } catch (error) {
    res.status(500);
    throw new Error("Failed to submit review: " + error.message);
  }
});

// Get parent's reviews
exports.getParentReviews = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  try {
    // Get parent profile
    const parentProfile = await ParentProfile.findOne({ user_id });
    if (!parentProfile) {
      res.status(404);
      throw new Error("Parent profile not found");
    }

    // Get parent's reviews
    const reviews = await TutorReview.find({ parent_id: parentProfile._id })
      .populate({
        path: 'tutor_id',
        populate: {
          path: 'user_id',
          select: 'full_name email photo_url'
        }
      })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      reviews: reviews
    });

  } catch (error) {
    res.status(500);
    throw new Error("Failed to fetch reviews: " + error.message);
  }
});

// Helper function to update tutor average rating
const updateTutorAverageRating = async (tutorId) => {
  try {
    const reviews = await TutorReview.find({ tutor_id: tutorId });
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      console.log('averageRating', averageRating);
      console.log('reviews', totalRating);
      await TutorProfile.findByIdAndUpdate(tutorId, {
        average_rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
      });
    }
  } catch (error) {
    console.error("Error updating tutor average rating:", error);
  }
};




