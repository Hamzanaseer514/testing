const asyncHandler = require("express-async-handler");
const User = require("../Models/userSchema");
const Student = require("../Models/studentProfileSchema");
const TutorProfile = require("../Models/tutorProfileSchema");
const TutorApplication = require("../Models/tutorApplicationSchema");
const TutorDocument = require("../Models/tutorDocumentSchema");
const ParentProfile = require("../Models/ParentProfileSchema");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { EducationLevel, Subject } = require("../Models/LookupSchema");
const jwt = require("jsonwebtoken")
const Rules = require("../Models/Rules");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../Utils/generateTokens");
const sendEmail = require("../Utils/sendEmail");
const otpStore = require("../Utils/otpStore");
const generateOtpEmail = require("../Utils/otpTempelate");






exports.refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("No refresh token, please log in again");
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.refreshToken !== refreshToken) {
      res.status(403);
      throw new Error("Invalid refresh token");
    }

    // Generate new access + refresh tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Save new refresh token, remove old one
    user.refreshToken = newRefreshToken;
    await user.save();

    // Update cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token expired or invalid, please log in again" });
  }
});


exports.registerUser = asyncHandler(async (req, res) => {
  const { full_name, email, password, age, academic_level, role } = req.body;

  if (!email || !password || !age || !full_name || !academic_level) {
    res.status(400);
    throw new Error(
      "Full name, email, password, age, and academic level are required"
    );
  }

  if (age < 12) {
    res.status(400);
    throw new Error("Age must be 12 or older");
  }
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
    );
  }

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.status(400);
    throw new Error("Email already exists");
  }

  try {
    const user = await User.create({
      full_name,
      email,
      password,
      age,
      role: role || "student",
      is_verified: "active",
      isEmailVerified: false
    });

    const student = await Student.create({
      user_id: user._id,
      academic_level,
    });

    res.status(201).json({
      message: "Student registered successfully",
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        age: user.age,
        role: user.role,
      },
      student: {
        academic_level: student.academic_level,
      },
    });
  } catch (error) {
    res.status(500);
    throw new Error("User/Student creation failed: " + error.message);
  }
});




function parseStringArray(field) {
  if (!field) return [];
  if (Array.isArray(field) && field.every(item => typeof item === "string")) {
    return field;
  }
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return [field];
    }
  }
  return [];
}

function parseObjectIdArray(field) {
  if (!field) return [];
  if (Array.isArray(field)) {
    return field
      .map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null)
      .filter(Boolean);
  }
  if (typeof field === "string") {
    try {
      const arr = JSON.parse(field);
      if (Array.isArray(arr)) {
        return arr
          .map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null)
          .filter(Boolean);
      }
    } catch {
      if (mongoose.Types.ObjectId.isValid(field)) {
        return [new mongoose.Types.ObjectId(field)];
      }
    }
  }
  return [];
}



exports.registerTutor = asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    password,
    phone_number,
    age,
    photo_url,
    qualifications,
    experience_years,
    subjects,
    academic_levels_taught,
    location,
    // hourly_rate,
    bio,
    code_of_conduct_agreed,
    documentsMap
  } = req.body;

  // ========================
  // 1️⃣ Required field check
  // ========================
  if (
    !email ||
    !password ||
    !age ||
    !full_name ||
    !qualifications ||
    !subjects ||
    !academic_levels_taught ||
    !location ||
    // !hourly_rate ||
    !experience_years ||
    code_of_conduct_agreed === undefined ||
    !documentsMap
  ) {
    res.status(400);
    throw new Error("All required fields must be provided!");
  }

  // ========================
  // 2️⃣ Email uniqueness check
  // ========================
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already exists");
  }

  // ========================
  // 3️⃣ Password strength check
  // ========================
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
    );
  }

  // ========================
  // 4️⃣ Transaction start
  // ========================
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Create User
    const user = await User.create(
      [
        {
          full_name,
          email,
          password,
          phone_number,
          age,
          role: "tutor",
          photo_url,
          is_verified: "inactive"
        }
      ],
      { session }
    );

    // Step 2: Parse Subjects
    const parsedSubjects = parseObjectIdArray(subjects);
    const subjectDetails = await Subject.find({
      _id: { $in: parsedSubjects }
    }).lean();

    // Step 2.1: Validate Subject Details
    if (subjectDetails.length !== parsedSubjects.length) {
      throw new Error("One or more subjects not found");
    }

    // Step 3: Fetch Education Level Details
    const parsedAcademicLevelIds = parseObjectIdArray(academic_levels_taught);
    const educationLevels = await EducationLevel.find({
      _id: { $in: parsedAcademicLevelIds }
    }).lean();

    if (educationLevels.length !== parsedAcademicLevelIds.length) {
      throw new Error("One or more academic levels not found");
    }

    // Step 4: Build Detailed Academic Levels Array
    const academicLevelsData = educationLevels.map(level => ({
      educationLevel: level._id,
      name: level.level,
      hourlyRate: level.hourlyRate || 0,
      monthlyRate: level.monthlyRate || 0,
      totalSessionsPerMonth: level.totalSessionsPerMonth || 0,
      discount: level.discount || 0
    }));

    // Step 5: Create Tutor Profile
    const tutorProfile = await TutorProfile.create(
      [
        {
          user_id: user[0]._id,
          bio: bio || "",
          qualifications,
          experience_years,
          subjects: parsedSubjects,
          academic_levels_taught: academicLevelsData,
          location,
          //  hourly_rate: parseFloat(hourly_rate),
          average_rating: 0,
          total_sessions: 0,
          is_verified: false,
          is_approved: false
        }
      ],
      { session }
    );

    // Step 6: Create Tutor Application Entry
    const tutorApplication = await TutorApplication.create(
      [
        {
          tutor_id: tutorProfile[0]._id,
          interview_status: "Pending",
          code_of_conduct_agreed,
          application_status: "Pending"
        }
      ],
      { session }
    );

    // Step 7: Handle Tutor Documents
    const savedDocuments = [];
    if (documentsMap && req.files && req.files["documents"]) {
      let documentsObj;
      try {
        documentsObj = JSON.parse(documentsMap);
      } catch {
        throw new Error("Invalid documentsMap format");
      }

      // Import FileHandler for base64 processing
      const FileHandler = require('../Utils/fileHandler');

      for (const [documentType, originalFileName] of Object.entries(documentsObj)) {
        const uploadedFile = req.files["documents"].find(
          file => file.originalname === originalFileName
        );
        if (!uploadedFile) continue;

        // Validate file
        if (!FileHandler.validateFile(uploadedFile)) {
          console.error(`Invalid file: ${originalFileName}`);
          continue;
        }

        // Process file and get data for database storage
        const fileData = FileHandler.processFile(uploadedFile);

        const newDoc = await TutorDocument.create(
          [
            {
              tutor_id: tutorProfile[0]._id,
              document_type: documentType,
              // New base64 fields
              fileName: fileData.fileName,
              originalName: fileData.originalName,
              mimetype: fileData.mimetype,
              size: fileData.size,
              base64Data: fileData.base64Data,
              fileType: fileData.fileType,
              // Legacy field for backward compatibility
              file_url: FileHandler.createFileUrl(fileData.fileName, process.env.BASE_URL || 'http://localhost:5000'),
              uploaded_at: new Date(),
              verification_status: "Pending"
            }
          ],
          { session }
        );

        savedDocuments.push(newDoc[0]);
      }
    }

    // Step 8: Commit Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Tutor registered successfully",
      user: {
        _id: user[0]._id,
        full_name: user[0].full_name,
        email: user[0].email,
        role: user[0].role,
        phone_number: user[0].phone_number,
        age: user[0].age,
        photo_url: user[0].photo_url
      },
      profile: tutorProfile[0],
      application: tutorApplication[0],
      documents: savedDocuments
    });

  } catch (error) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();
    res.status(500);
    throw new Error("Tutor registration failed: " + error.message);
  }
});

exports.registerParent = asyncHandler(async (req, res) => {
  const { full_name, email, phone_number, password, age } = req.body;
console.log(req.body)
  // Get photo URL from uploaded file or use default
  let photo_url = null;
  if (req.body.photo_url) {
    // If it's already a full URL, use it; otherwise create proper URL
    if (req.body.photo_url.startsWith('http')) {
      photo_url = req.body.photo_url;
    } else {
      photo_url = `${process.env.BASE_URL || 'http://localhost:5000'}/api/files/${req.body.photo_url}`;
    }
  }
  console.log("Photo URL:", photo_url);
  if (!email || !password || !full_name) {
    res.status(400);
    throw new Error("Full name, email, and password are required");
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
    );
  }

  if (age < 20) {
    res.status(400);
    throw new Error("Age must be 20 or older");
  }

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.status(400);
    throw new Error("Email already exists");
  }



  // const session = await User.startSession();
  // session.startTransaction();

  try {
    const user = await User.create(
      [
        {
          full_name,
          email,
          password,
          phone_number,
          age,
          role: "parent",
          photo_url,
          is_verified: "active",
        },
      ]
      // { session }
    );

    const parent = await ParentProfile.create(
      [
        {
          user_id: user[0]._id,
          students: [], // start with empty student array
        },
      ]
      // { session }
    );

    // await session.commitTransaction();
    // session.endSession();

    res.status(201).json({
      message: "Parent registered successfully",
      _id: user[0]._id,
      full_name: user[0].full_name,
      email: user[0].email,
      role: user[0].role,
      phone_number: user[0].phone_number,
      age: user[0].age,
      photo_url: user[0].photo_url,
      parentProfile: parent[0],
    });
  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    res.status(500);
    throw new Error("Parent creation failed: " + error.message);
  }
});


exports.logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(200).json({ message: "Already logged out" });
  }

  // 🔥 Refresh token verify karne ki zaroorat nahi
  const user = await User.findOne({ refreshToken });

  if (user) {
    user.refreshToken = null; // DB se hata do
    await user.save();
  }

  // Cookie clear
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logged out successfully" });
});




exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  console.log(user);

  if (user.is_verified === "inactive") {
    res.status(403);
    throw new Error("User not verified. Please be patient, Admin will verify you soon");
  }

  // === STUDENT LOGIN ===
  if (user.role === "student") {
    const otpRule = await Rules.findOne();
    const otpActive = otpRule?.otp_rule_active || false;

    if (otpActive && !user.isEmailVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[user._id] = {
        otp,
        expiresAt: Date.now() + 60000,
        attempts: 1,
        maxAttempts: 5,
        lockUntil: null,
      };
      const htmlContent = generateOtpEmail(otp, user.username);
      await sendEmail(user.email, "Your TutorBy OTP Code", htmlContent);

      return res.status(200).json({
        message: "OTP sent to your email",
        isOtpTrue: true,
        userId: user._id,
        email: user.email,
      });
    } else {
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshToken = refreshToken;
      await user.save();

      setRefreshCookie(res, refreshToken);

      return res.status(200).json({
        message: "Login successful (OTP not required)",
        isOtpTrue: false,
        user: {
          _id: user._id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          is_verified: user.is_verified,
          isEmailVerified: user.isEmailVerified
        },
        accessToken,
      });
    }
  }

  // === TUTOR OR PARENT LOGIN (OTP first, no refresh token yet) ===
  if (user.role === "tutor" || user.role === "parent") {
    console.log("user is in condition");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user._id] = {
      otp,
      expiresAt: Date.now() + 60000,
      attempts: 1,
      maxAttempts: 5,
      lockUntil: null,
    };

    console.log("opt sending")

    const htmlContent = generateOtpEmail(otp, user.username);
    await sendEmail(user.email, "Your TutorBy OTP Code", htmlContent);
    console.log("hogae send")

    return res.status(200).json({
      isOtpTrue: true,
      message: "OTP sent to your email",
      userId: user._id,
      email: user.email,
    });
  }

  // === ADMIN LOGIN (no OTP, issue tokens immediately) ===
  if (user.role === "admin") {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: "Admin login successful",
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        isEmailVerified: user.isEmailVerified
      },
      accessToken,
    });
  }
});

// === HELPER: Set Refresh Token Cookie ===

// production
// function setRefreshCookie(res, refreshToken) {
//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });
// }
// local
function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,        // localhost ke liye false
    sameSite: "lax",      // dev ke liye lax
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}


exports.verifyOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const entry = otpStore[userId];

  if (!entry) {
    return res.status(400).json({ message: "No OTP request found" });
  }

  if (entry.lockUntil && Date.now() < entry.lockUntil) {
    return res
      .status(429)
      .json({ message: "Too many attempts. Try after 30 minutes." });
  }

  if (Date.now() > entry.expiresAt) {
    return res.status(400).json({ message: "OTP expired. Please regenerate." });
  }

  if (otp !== entry.otp) {
    entry.attempts++;
    if (entry.attempts >= entry.maxAttempts) {
      entry.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lock
      return res
        .status(429)
        .json({ message: "Too many wrong attempts. Try after 30 minutes." });
    }
    return res.status(401).json({ message: "Incorrect OTP" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // ✅ Case 1: Forgot Password (no tokens)
  if (entry.purpose === "forgotPassword") {
    delete otpStore[userId];
    return res.status(200).json({
      message: "OTP verified successfully. You can now reset your password.",
      userId,
    });
  }

  // === Load role-specific data ===
  let roleData = null;
  if (user.role === "student") {
    roleData = await Student.findOne({ user_id: user._id }).select("-__v -createdAt -updatedAt");
  } else if (user.role === "tutor") {
    roleData = await TutorProfile.findOne({ user_id: user._id }).select("-__v -createdAt -updatedAt");
  } else if (user.role === "parent") {
    roleData = await ParentProfile.findOne({ user_id: user._id }).select("-__v -createdAt -updatedAt");
  } else if (user.role === "admin") {
    roleData = {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };
  }

  // === Mark email verified ===
  user.isEmailVerified = true;

  // === Generate & save refresh token ===
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  // === Set cookie ===
  setRefreshCookie(res, refreshToken);

  delete otpStore[userId];

  return res.status(200).json({
    message: "Login successful",
    user: {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      isEmailVerified: user.isEmailVerified,
    },
    data: roleData,
    accessToken,
  });
});



// Send email verification for students
exports.sendEmailVerification = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "student") {
    res.status(403);
    throw new Error("This endpoint is only for students");
  }

  if (user.isEmailVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  // Generate OTP for email verification
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[user._id] = {
    otp,
    expiresAt: Date.now() + 60000, // 1 minute
    attempts: 1,
    maxAttempts: 5,
    lockUntil: null,
    purpose: "emailVerification"
  };

  const htmlContent = generateOtpEmail(otp, user.full_name);
  await sendEmail(user.email, "Verify Your Email - TutorBy", htmlContent);

  res.status(200).json({
    message: "Verification email sent successfully",
    email: user.email,
  });
});

// Verify email with OTP
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    res.status(400);
    throw new Error("User ID and OTP are required");
  }

  const entry = otpStore[userId];

  if (!entry) {
    return res.status(400).json({ message: "No verification request found" });
  }

  if (entry.purpose !== "emailVerification") {
    return res.status(400).json({ message: "Invalid verification request" });
  }

  if (entry.lockUntil && Date.now() < entry.lockUntil) {
    return res
      .status(429)
      .json({ message: "Too many attempts. Try after 30 minutes." });
  }

  if (Date.now() > entry.expiresAt) {
    return res.status(400).json({ message: "Verification code expired. Please request a new one." });
  }

  if (otp !== entry.otp) {
    entry.attempts++;
    if (entry.attempts >= entry.maxAttempts) {
      entry.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lock
      return res
        .status(429)
        .json({ message: "Too many wrong attempts. Try after 30 minutes." });
    }
    return res.status(401).json({ message: "Incorrect verification code" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Mark email as verified
  user.isEmailVerified = true;
  await user.save();

  // Clean up OTP store
  delete otpStore[userId];

  res.status(200).json({
    message: "Email verified successfully",
    user: {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const entry = otpStore[userId];

  if (!entry) {
    return res.status(400).json({ message: "OTP not requested yet" });
  }

  if (entry.lockUntil && Date.now() < entry.lockUntil) {
    return res
      .status(429)
      .json({ message: "Too many attempts. Try after 30 minutes." });
  }

  // Use a separate resend counter
  entry.resendAttempts = (entry.resendAttempts || 0) + 1;
  if (entry.resendAttempts > 5) {
    entry.lockUntil = Date.now() + 30 * 60 * 1000; // 30 mins
    return res
      .status(429)
      .json({ message: "OTP resend limit reached. Try after 30 minutes." });
  }

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[userId] = {
    ...entry,
    otp: newOtp,
    expiresAt: Date.now() + 60000,
  };

  const user = await User.findById(userId);
  const htmlContent = generateOtpEmail(newOtp, user.username);
  await sendEmail(user.email, "Your TutorBy OTP Code", htmlContent);

  res.status(200).json({ message: "New OTP sent to your email." });
});



exports.addAdmin = asyncHandler(async (req, res) => {
  const { full_name, email, password, phone_number } = req.body;

  if (!email || !password || !full_name || !phone_number) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.status(400);
    throw new Error("Email already exists");
  }

  try {
    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create([
      {
        full_name,
        email,
        password,
        phone_number,
        role: "admin",
        is_verified: "active", // ✅ manually set as admin
      },
    ]);

    res.status(201).json({
      message: `Admin ${user[0].full_name} added successfully`,
      _id: user[0]._id,
      full_name: user[0].full_name,
      email: user[0].email,
      role: user[0].role,
      is_verified: user[0].is_verified,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Admin creation failed: " + error.message);
  }
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("No user found with this email");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[user._id] = {
    otp,
    expiresAt: Date.now() + 60000,
    attempts: 1,
    maxAttempts: 5,
    lockUntil: null,
    purpose: "forgotPassword",
  };

  const htmlContent = generateOtpEmail(
    otp,
    user.full_name || user.username || "User"
  );
  await sendEmail(user.email, "Reset Your Password - OTP", htmlContent);

  res.status(200).json({
    message: "OTP sent to your email for password reset",
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { userId, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: "Password reset successfully" });
});


exports.getUserProfile = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const user = await User.findById(user_id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.status(200).json(user);
});

exports.updateUserPhoto = asyncHandler(async (req, res) => {
  console.log(req.params);
  try {
    const { user_id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Process file for base64 storage
    const FileHandler = require('../Utils/fileHandler');
    
    // Validate file
    if (!FileHandler.validateFile(req.file)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file. Only images and PDFs up to 10MB are allowed.' 
      });
    }

    // Process file and get data for database storage
    const fileData = FileHandler.processFile(req.file);
    
    // Create file URL for photo
    const photoUrl = FileHandler.createFileUrl(fileData.fileName, process.env.BASE_URL || 'http://localhost:5000');

    const user = await User.findByIdAndUpdate(
      user_id,
      { 
        photo_url: photoUrl,
        // Store base64 data in user model if needed (optional)
        photo_base64: fileData.base64Data,
        photo_mimetype: fileData.mimetype
      },
      { new: true }
    ).select('photo_url');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    return res.status(200).json({ success: true, photo_url: user.photo_url });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

exports.registerStudentWithGoogle = asyncHandler(async (req, res) => {
  const { id_token, role = "student" } = req.body;

  if (!id_token) {
    res.status(400);
    throw new Error("Google ID token is required");
  }

  if (role !== "student") {
    res.status(400);
    throw new Error("This endpoint is only for student registration");
  }

  try {
    // Verify Google ID token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: google_id } = payload;

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email }, { google_id }]
    });

    if (user) {
      // User exists, check if they're a student
      if (user.role !== "student") {
        res.status(400);
        throw new Error("Email already registered with a different role");
      }

      // Account already exists - return error for registration
      res.status(400);
      throw new Error("Account already registered with this email. Please login instead.");
    }

    // Create new user with Google OAuth
    const newUser = await User.create({
      full_name: name,
      email,
      google_id,
      is_google_user: true,
      photo_url: picture,
      role: "student",
      age: 15, // Default age for students
      is_verified: "active",
      isEmailVerified: true,
    });

    // Create student profile with default values
    const studentProfile = await Student.create({
      user_id: newUser._id,
      // Default values will be used from schema
    });

    // Generate tokens
    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Student registered successfully with Google",
      user: {
        _id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        age: newUser.age,
        role: newUser.role,
        photo_url: newUser.photo_url,
        is_google_user: newUser.is_google_user,
      },
      student: studentProfile,
      accessToken,
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error("Google token expired. Please try again.");
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401);
      throw new Error("Invalid Google token.");
    }

    res.status(500);
    throw new Error("Google OAuth registration failed: " + error.message);
  }
});

exports.loginWithGoogle = asyncHandler(async (req, res) => {
  const { id_token } = req.body;

  if (!id_token) {
    res.status(400);
    throw new Error("Google ID token is required");
  }

  try {
    // Verify Google ID token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: google_id } = payload;


    // Check if user exists
    const user = await User.findOne({
      $or: [{ email }, { google_id }]
    });

    if (!user) {
      res.status(404);
      throw new Error("Account not found. Please register first using the registration page.");
    }


    // Check if user is a student (only students can login with Google)
    if (user.role !== "student") {
      res.status(403);
      throw new Error("Google OAuth login is only available for students. Please use regular login.");
    }

    // Update Google OAuth info if not already set
    if (!user.google_id) {
      user.google_id = google_id;
      user.is_google_user = true;
      user.photo_url = picture || user.photo_url;
      await user.save();
    }

    // Check if user is verified
    if (user.is_verified === "inactive") {
      res.status(403);
      throw new Error("User not verified. Please contact admin.");
    }

    // Get student profile data
    const studentProfile = await Student.findOne({ user_id: user._id });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const responseData = {
      message: "Login successful with Google",
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        age: user.age,
        role: user.role,
        photo_url: user.photo_url,
        is_google_user: user.is_google_user,
        is_verified: user.is_verified,
        isEmailVerified: user.isEmailVerified
      },
      student: studentProfile,
      accessToken,
      isOtpTrue: false // No OTP required for Google OAuth
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Google OAuth login error:', error);

    if (error.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error("Google token expired. Please try again.");
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401);
      throw new Error("Invalid Google token.");
    }

    res.status(500);
    throw new Error("Google OAuth login failed: " + error.message);
  }
});

exports.testGoogleOAuth = asyncHandler(async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        error: "Google Client ID not configured",
        message: "Please set GOOGLE_CLIENT_ID in environment variables"
      });
    }

    res.status(200).json({
      message: "Google OAuth configuration is working",
      clientId: clientId.substring(0, 20) + "...", // Show first 20 chars for security
      hasGoogleAuth: !!require('google-auth-library')
    });
  } catch (error) {
    res.status(500).json({
      error: "Google OAuth test failed",
      message: error.message
    });
  }
});
