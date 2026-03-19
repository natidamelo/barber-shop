const mongoose = require('mongoose');

const staffScheduleSchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  start_time: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  end_time: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  break_start: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Break start time must be in HH:MM format'
    }
  },
  break_end: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Break end time must be in HH:MM format'
    }
  },
  is_available: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  schedule_type: {
    type: String,
    enum: ['regular', 'overtime', 'holiday'],
    default: 'regular'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
staffScheduleSchema.index({ staff_id: 1 });
staffScheduleSchema.index({ date: 1 });
staffScheduleSchema.index({ staff_id: 1, date: 1 }, { unique: true });

// Virtual for working hours duration
staffScheduleSchema.virtual('working_hours').get(function() {
  const start = new Date(`1970-01-01T${this.start_time}:00`);
  const end = new Date(`1970-01-01T${this.end_time}:00`);
  const diff = (end - start) / (1000 * 60 * 60); // in hours
  
  // Subtract break time if available
  if (this.break_start && this.break_end) {
    const breakStart = new Date(`1970-01-01T${this.break_start}:00`);
    const breakEnd = new Date(`1970-01-01T${this.break_end}:00`);
    const breakDuration = (breakEnd - breakStart) / (1000 * 60 * 60);
    return Math.max(0, diff - breakDuration);
  }
  
  return Math.max(0, diff);
});

// Virtual for formatted date
staffScheduleSchema.virtual('formatted_date').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Pre-populate staff reference
staffScheduleSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'staff_id',
    select: 'first_name last_name email role'
  });
  next();
});

// Validation for break times
staffScheduleSchema.pre('save', function(next) {
  // If both break times are provided, validate they're within working hours
  if (this.break_start && this.break_end) {
    const start = new Date(`1970-01-01T${this.start_time}:00`);
    const end = new Date(`1970-01-01T${this.end_time}:00`);
    const breakStart = new Date(`1970-01-01T${this.break_start}:00`);
    const breakEnd = new Date(`1970-01-01T${this.break_end}:00`);
    
    if (breakStart < start || breakEnd > end || breakStart >= breakEnd) {
      return next(new Error('Break times must be within working hours and valid'));
    }
  }
  
  // Validate that end time is after start time
  const start = new Date(`1970-01-01T${this.start_time}:00`);
  const end = new Date(`1970-01-01T${this.end_time}:00`);
  
  if (end <= start) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

// Static method to find schedule by date range
staffScheduleSchema.statics.findByDateRange = function(startDate, endDate, staffId = null) {
  const query = {
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (staffId) {
    query.staff_id = staffId;
  }
  
  return this.find(query).sort({ date: 1, start_time: 1 });
};

// Static method to check availability
staffScheduleSchema.statics.isStaffAvailable = function(staffId, date) {
  return this.findOne({
    staff_id: staffId,
    date: date,
    is_available: true
  });
};

module.exports = mongoose.model('StaffSchedule', staffScheduleSchema);