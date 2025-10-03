const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: function() {
      return !this.google_id; // Password not required if Google OAuth
    }
  },
  phone_number: {
    type: String,
  },
  role: {
    type: String,
    enum: ['tutor', 'student', 'parent', 'admin']
  },
  age: {
    type: Number,
    min: 0,
    default: 15 // Default age for students
  },
  photo_url: {
    type: String,
    default: ''
  },
  google_id: {
    type: String,
    sparse: true
  },
  is_google_user: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  is_verified: {
    type: String,
    enum: ['active', 'inactive', 'partial_active'],
    default: 'active' // Google users are verified by default
  },
  refreshToken: { type: String },

  isEmailVerified: {
    type: Boolean,
    default: true // Google users have verified emails
  }
}, { timestamps: true });

// 🔐 Hash password before saving (only if password exists and is modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Method to compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
