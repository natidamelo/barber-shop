const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    unique: true,
    trim: true,
    maxlength: [255, 'Service name cannot exceed 255 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    set: val => Math.round(val * 100) / 100 // Round to 2 decimal places
  },
  shop_cut: {
    type: Number,
    min: [0, 'Shop cut cannot be negative'],
    default: 0,
    set: val => Math.round(val * 100) / 100 // Round to 2 decimal places
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 480 minutes']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  image_url: {
    type: String,
    maxlength: [500, 'Image URL cannot exceed 500 characters'],
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  requirements: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  is_active: {
    type: Boolean,
    default: true
  },
  sort_order: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
serviceSchema.index({ name: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ is_active: 1 });
serviceSchema.index({ sort_order: 1 });

// Virtual for formatted price
serviceSchema.virtual('formatted_price').get(function() {
  if (this.price == null || isNaN(Number(this.price))) return '';
  return `$${Number(this.price).toFixed(2)}`;
});

// Virtual for formatted duration
serviceSchema.virtual('formatted_duration').get(function() {
  if (this.duration == null || isNaN(Number(this.duration))) return '';
  const dur = Number(this.duration);
  if (dur >= 60) {
    const hours = Math.floor(dur / 60);
    const minutes = dur % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${dur}m`;
});

// Static method to get active services
serviceSchema.statics.findActive = function() {
  return this.find({ is_active: true }).sort({ sort_order: 1, name: 1 });
};

// Static method to get services by category
serviceSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category: new RegExp(category, 'i'),
    is_active: true 
  }).sort({ sort_order: 1, name: 1 });
};

module.exports = mongoose.model('Service', serviceSchema);