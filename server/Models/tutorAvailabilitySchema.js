
const mongoose = require('mongoose');

// Schema for blackout dates (when tutor is unavailable)
const blackoutDateSchema = new mongoose.Schema({
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  reason: { type: String, default: '' },
  is_active: { type: Boolean, default: true }
});

// Main availability schema
const tutorAvailabilitySchema = new mongoose.Schema({
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: true,
    unique: true
  },

  // General availability (per weekday)
  general_availability: {
    monday:    { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: true } },
    tuesday:   { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: true } },
    wednesday: { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: true } },
    thursday:  { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: true } },
    friday:    { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: true } },
    saturday:  { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: false } },
    sunday:    { start: { type: String, default: "09:00" }, end: { type: String, default: "17:00" }, available: { type: Boolean, default: false } }
  },

  // Booking rules
  minimum_notice_hours: { type: Number, default: 2, min: 0 },
  maximum_advance_days: { type: Number, default: 30, min: 1 },

  // Session duration options (in minutes)
  session_durations: {
    type: [Number],
    default: [30, 60, 90, 120],
    validate: {
      validator: function (v) {
        return v.length > 0 && v.every(d => d > 0 && d <= 480);
      },
      message: 'Session durations must be positive and ≤ 8 hours'
    }
  },

  // Blackout dates
  blackout_dates: [blackoutDateSchema],

  // Whether the tutor is accepting bookings
  is_accepting_bookings: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes
// tutorAvailabilitySchema.index({ tutor_id: 1 });
tutorAvailabilitySchema.index({ 'blackout_dates.start_date': 1, 'blackout_dates.end_date': 1 });

// Method to check if a specific date/time is available
tutorAvailabilitySchema.methods.isAvailable = function (date, durationMinutes = 60) {
  const checkDate = new Date(date);
  const dayOfWeek = checkDate.getDay();
  const timeString = checkDate.toTimeString().slice(0, 5); // "HH:MM"

  // 1. Accepting bookings?
  if (!this.is_accepting_bookings) return false;

  // 2. Check blackout dates
  if (this.blackout_dates.some(b =>
    b.is_active &&
    checkDate >= b.start_date &&
    checkDate <= b.end_date
  )) return false;

  // 3. Get day availability
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayAvailability = this.general_availability[dayNames[dayOfWeek]];
  if (!dayAvailability?.available) return false;

  // 4. Check time within availability window
  if (timeString < dayAvailability.start || timeString > dayAvailability.end) return false;

  return true;
};

// Method to get all available slots for a specific day
tutorAvailabilitySchema.methods.getAvailableSlots = function (date) {
  const checkDate = new Date(date);
  const dayOfWeek = checkDate.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayAvailability = this.general_availability[dayNames[dayOfWeek]];

  if (!dayAvailability?.available) return [];

  const slots = [];
  const startTime = new Date(`2000-01-01T${dayAvailability.start}:00`);
  const endTime = new Date(`2000-01-01T${dayAvailability.end}:00`);

  this.session_durations.forEach(duration => {
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);

      if (slotEnd <= endTime) {
        const slotDate = new Date(checkDate);
        slotDate.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);

        if (this.isAvailable(slotDate, duration)) {
          slots.push({
            start: slotDate,
            end: new Date(slotDate.getTime() + duration * 60000),
            duration
          });
        }
      }
      currentTime = new Date(currentTime.getTime() + 30 * 60000); // step 30 mins
    }
  });

  return slots;
};

module.exports = mongoose.model('TutorAvailability', tutorAvailabilitySchema);
