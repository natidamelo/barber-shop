const mongoose = require('mongoose');

const barberTipSchema = new mongoose.Schema({
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
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  },
  points: {
    type: Number,
    required: [true, 'Points is required'],
    min: [1, 'Points must be at least 1']
  },
  message: {
    type: String,
    trim: true,
    maxlength: [200, 'Message cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

barberTipSchema.index({ customer_id: 1 });
barberTipSchema.index({ barber_id: 1 });
barberTipSchema.index({ appointment_id: 1 });

module.exports = mongoose.model('BarberTip', barberTipSchema);
