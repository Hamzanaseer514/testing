const mongoose = require('mongoose');

const studentPaymentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    required: true
  },
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorProfile',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  academic_level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationLevel',
    required: true
  },
  
  // Payment Type and Amount Details
  payment_type: {
    type: String,
    enum: ['monthly', 'hourly'],
    required: true
  },
  base_amount: {
    type: Number,
    required: true,
    min: 0
  },

  discount_percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Monthly Package Details (if payment_type is 'monthly')
  monthly_amount: {
    type: Number,
    min: 0
  },
  total_sessions_per_month: {
    type: Number,
    min: 1
  },

  
  // Validity and Session Limits
  validity_start_date: {
    type: Date,
    required: true
  },
  validity_end_date: {
    type: Date,
    required: true
  },
  


  sessions_remaining: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment Status
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Payment Validity Status
  validity_status: {
    type: String,
    enum: ['pending','active', 'expired'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['card', 'bank_transfer', 'paypal'],
    default: 'card'
  },
  payment_date: {
    type: Date
  },
  
  // Request Details
  request_date: {
    type: Date,
    default: Date.now
  },
  request_notes: {
    type: String,
    default: ''
  },
  
  // Access Control
  academic_level_paid: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Additional Details
  currency: {
    type: String,
    default: 'GBP'
  },
  gateway_transaction_id: {
    type: String
  },
  gateway_response: {
    type: Object
  },

  // Renewal tracking fields
  is_renewal: {
    type: Boolean,
    default: false
  },
  original_payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentPayment'
  }

}, { 
  timestamps: true 
});

// Indexes for better performance
studentPaymentSchema.index({ student_id: 1, payment_status: 1 });
studentPaymentSchema.index({ tutor_id: 1, payment_status: 1 });
studentPaymentSchema.index({ subject: 1, academic_level: 1 });
studentPaymentSchema.index({ payment_status: 1, academic_level_paid: 1 });
studentPaymentSchema.index({ validity_end_date: 1, is_active: 1 });
studentPaymentSchema.index({ payment_type: 1, payment_status: 1 });



// Enhanced isValid method for session validation with validity status
studentPaymentSchema.methods.isValid = function() {
  const now = new Date();
  const isExpired = this.validity_end_date <= now.getTime();
  
  // Update validity_status if expired
  if (isExpired && this.validity_status === 'active') {
    this.validity_status = 'expired';
    this.is_active = false;
    this.save(); // Save the updated status
  }
  
  return this.is_active && 
         this.payment_status === 'paid' && 
         this.validity_status === 'active' &&
         !isExpired &&
         this.sessions_remaining > 0;
};

// Method to check if payment is expired
studentPaymentSchema.methods.isExpired = function() {
  const now = new Date();
  return this.validity_end_date <= now.getTime();
};

// Method to get payment status with validity
studentPaymentSchema.methods.getPaymentStatus = function() {
  if (this.payment_status !== 'paid') {
    return this.payment_status;
  }
  
  if (this.isExpired()) {
    return 'expired';
  }
  
  return 'active';
};

module.exports = mongoose.model('StudentPayment', studentPaymentSchema);
