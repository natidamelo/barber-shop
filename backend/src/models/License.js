const mongoose = require('mongoose');
const crypto = require('crypto');

const licenseSchema = new mongoose.Schema({
  license_key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer_name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customer_email: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true
  },
  customer_phone: {
    type: String,
    trim: true,
    default: null
  },
  computer_id: {
    type: String,
    trim: true,
    default: null
  },
  start_date: {
    type: Date,
    required: true
  },
  expire_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'pending_activation'],
    default: 'pending_activation'
  },
  notes: {
    type: String,
    trim: true,
    default: null
  },
  activated_at: {
    type: Date,
    default: null
  },
  last_checked_at: {
    type: Date,
    default: null
  },
  renewal_history: [
    {
      renewed_at: { type: Date },
      previous_expire_date: { type: Date },
      new_expire_date: { type: Date },
      renewed_by: { type: String }
    }
  ]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

licenseSchema.index({ customer_email: 1 });
licenseSchema.index({ status: 1 });
licenseSchema.index({ expire_date: 1 });

licenseSchema.virtual('is_expired').get(function () {
  return new Date() > this.expire_date;
});

licenseSchema.virtual('days_remaining').get(function () {
  const diff = this.expire_date - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Generate a formatted license key: XXXX-XXXX-XXXX-XXXX
licenseSchema.statics.generateKey = function () {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
};

module.exports = mongoose.model('License', licenseSchema);
