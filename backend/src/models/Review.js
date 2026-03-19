const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Rating must be a whole number'
    }
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_published: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
reviewSchema.index({ customer_id: 1 });
reviewSchema.index({ barber_id: 1 });
reviewSchema.index({ service_id: 1 });
reviewSchema.index({ appointment_id: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ is_published: 1 });
reviewSchema.index({ barber_id: 1, is_published: 1 });

// Compound index for unique appointment reviews
reviewSchema.index({ appointment_id: 1 }, { 
  unique: true, 
  sparse: true, // Allow multiple null values
  partialFilterExpression: { appointment_id: { $ne: null } }
});

// Virtual for star rating display
reviewSchema.virtual('star_rating').get(function() {
  return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
});

// Pre-populate references
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'customer_id',
    select: 'first_name last_name'
  }).populate({
    path: 'barber_id',
    select: 'first_name last_name'
  }).populate({
    path: 'service_id',
    select: 'name category'
  });
  next();
});

// Static method to get average rating for a barber
reviewSchema.statics.getBarberStats = function(barberId) {
  return this.aggregate([
    {
      $match: {
        barber_id: new mongoose.Types.ObjectId(barberId),
        is_published: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 1] },
        totalReviews: 1,
        ratingDistribution: {
          $arrayToObject: [
            [
              { k: '5', v: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 5] } } } } },
              { k: '4', v: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 4] } } } } },
              { k: '3', v: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 3] } } } } },
              { k: '2', v: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 2] } } } } },
              { k: '1', v: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 1] } } } } }
            ]
          ]
        }
      }
    }
  ]);
};

// Static method to get service rating stats
reviewSchema.statics.getServiceStats = function(serviceId) {
  return this.aggregate([
    {
      $match: {
        service_id: new mongoose.Types.ObjectId(serviceId),
        is_published: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 1] },
        totalReviews: 1
      }
    }
  ]);
};

module.exports = mongoose.model('Review', reviewSchema);