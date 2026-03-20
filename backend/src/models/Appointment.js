const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  barber_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Barber ID is required']
  },
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  },
  appointment_date: {
    type: Date,
    required: [true, 'Appointment date is required'],
    validate: {
      validator: function(v) {
        // Allow past/current dates for walk-in appointments
        if (this.is_walk_in) {
          return true;
        }
        return v > new Date();
      },
      message: 'Appointment date must be in the future'
    }
  },
  is_walk_in: {
    type: Boolean,
    default: false
  },
  end_time: {
    type: Date,
    required: [true, 'End time is required']
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  customer_notes: {
    type: String,
    maxlength: [500, 'Customer notes cannot exceed 500 characters']
  },
  barber_notes: {
    type: String,
    maxlength: [500, 'Barber notes cannot exceed 500 characters']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    set: val => Math.round(val * 100) / 100
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid', 'refunded'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'online', 'other'],
    default: null
  },
  amount_paid: {
    type: Number,
    min: [0, 'Amount paid cannot be negative'],
    default: 0,
    set: val => Math.round(val * 100) / 100
  },
  shop_cut: {
    type: Number,
    min: [0, 'Shop cut cannot be negative'],
    default: 0,
    set: val => Math.round(val * 100) / 100
  },
  barber_commission: {
    type: Number,
    min: [0, 'Barber commission cannot be negative'],
    default: 0,
    set: val => Math.round(val * 100) / 100
  },
  reminder_sent_at: {
    type: Date,
    default: null
  },
  confirmation_sent_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
appointmentSchema.index({ customer_id: 1 });
appointmentSchema.index({ barber_id: 1 });
appointmentSchema.index({ service_id: 1 });
appointmentSchema.index({ appointment_date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ barber_id: 1, appointment_date: 1 });

// Compound index for conflict checking
appointmentSchema.index({ 
  barber_id: 1, 
  appointment_date: 1, 
  end_time: 1, 
  status: 1 
});

// Virtual for duration
appointmentSchema.virtual('duration').get(function() {
  return Math.round((this.end_time - this.appointment_date) / (1000 * 60)); // in minutes
});

// Virtual for formatted price
appointmentSchema.virtual('formatted_price').get(function() {
  return this.price ? `$${this.price.toFixed(2)}` : null;
});

// Pre-populate references
appointmentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'customer_id',
    select: 'first_name last_name email phone'
  }).populate({
    path: 'barber_id',
    select: 'first_name last_name email phone'
  }).populate({
    path: 'service_id',
    select: 'name duration price category'
  });
  next();
});

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate, barberId = null, adminId = null) {
  const query = {
    appointment_date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (barberId) {
    query.barber_id = barberId;
  }

  if (adminId) {
    query.admin_id = adminId;
  }
  
  return this.find(query).sort({ appointment_date: 1 });
};

// Static method to check for conflicts
appointmentSchema.statics.checkConflict = function(barberId, startTime, endTime, excludeId = null, adminId = null) {
  const query = {
    barber_id: barberId,
    status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
    $or: [
      {
        appointment_date: { $lt: endTime },
        end_time: { $gt: startTime }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  if (adminId) {
    query.admin_id = adminId;
  }
  
  return this.findOne(query);
};

module.exports = mongoose.model('Appointment', appointmentSchema);