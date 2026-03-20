const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const mongoose = require('mongoose');
const { Review, User, Service, Appointment } = require('../models');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to format review for response (normalize id/_id, created_at/createdAt)
const formatReview = (r) => {
  if (!r) return null;
  const review = r.toObject ? r.toObject() : (typeof r === 'object' ? r : {});
  const cust = review.customer_id;
  const barb = review.barber_id;
  const serv = review.service_id;
  return {
    id: review._id?.toString?.() || review.id,
    _id: review._id?.toString?.() || review.id,
    customer_id: cust?._id || cust,
    barber_id: barb?._id || barb,
    service_id: serv?._id || serv,
    appointment_id: review.appointment_id,
    rating: review.rating,
    comment: review.comment || '',
    is_verified: !!review.is_verified,
    is_published: review.is_published !== false,
    created_at: review.createdAt || review.created_at,
    customer_first_name: (typeof cust === 'object' && cust) ? cust.first_name : undefined,
    customer_last_name: (typeof cust === 'object' && cust) ? cust.last_name : undefined,
    barber_first_name: (typeof barb === 'object' && barb) ? barb.first_name : undefined,
    barber_last_name: (typeof barb === 'object' && barb) ? barb.last_name : undefined,
    service_name: (typeof serv === 'object' && serv) ? serv.name : undefined
  };
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
router.get('/', optionalAuth, [
  query('barber_id').optional().isMongoId().withMessage('Barber ID must be a valid ID'),
  query('service_id').optional().isMongoId().withMessage('Service ID must be a valid ID'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  query('verified').optional().isBoolean().withMessage('Verified must be a boolean'),
  query('sort').optional().isIn(['rating', 'createdAt']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { barber_id, service_id, rating, verified, sort = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

    let query = { is_published: true };
    if (req.shop_id) {
       query.admin_id = req.shop_id;
    }
    
    if (barber_id) query.barber_id = barber_id;
    if (service_id) query.service_id = service_id;
    if (rating) query.rating = parseInt(rating);
    if (verified !== undefined) query.is_verified = verified === 'true';

    const reviews = await Review.find(query)
      .populate('customer_id', 'first_name last_name')
      .populate('barber_id', 'first_name last_name')
      .populate('service_id', 'name')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      data: reviews.map(r => formatReview(r))
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Check if appointment has a review (for customers)
// @route   GET /api/reviews/appointment/:appointmentId/has-review
// @access  Private (Customer)
router.get('/appointment/:appointmentId/has-review', protect, authorize('customer'), [
  param('appointmentId').isMongoId().withMessage('Appointment ID must be valid')
], async (req, res, next) => {
  try {
    const customerId = req.user._id || req.user.id;
    const review = await Review.findOne({
      appointment_id: req.params.appointmentId,
      customer_id: customerId
    });
    res.status(200).json({ success: true, has_review: !!review });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's reviews (customer's own reviews) - MUST be before /:id
// @route   GET /api/reviews/my-reviews
// @access  Private (Customer)
router.get('/my-reviews', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const customerId = req.user._id || req.user.id;

    const reviews = await Review.find({ customer_id: customerId })
      .populate('barber_id', 'first_name last_name')
      .populate('service_id', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 100)
      .skip(((parseInt(page) || 1) - 1) * (parseInt(limit) || 100))
      .lean();

    const total = await Review.countDocuments({ customer_id: customerId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 100,
        pages: Math.ceil(total / (parseInt(limit) || 100))
      },
      data: reviews.map(r => ({
        ...r,
        id: r._id,
        created_at: r.createdAt,
        barber_first_name: r.barber_id?.first_name,
        barber_last_name: r.barber_id?.last_name,
        service_name: r.service_id?.name
      }))
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Review ID must be valid')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    }).populate('customer_id', 'first_name last_name')
      .populate('barber_id', 'first_name last_name')
      .populate('service_id', 'name');

    if (!review || !review.is_published) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.status(200).json({ success: true, data: formatReview(review) });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), [
  body('barber_id').isMongoId().withMessage('Barber ID must be valid'),
  body('service_id').isMongoId().withMessage('Service ID must be valid'),
  body('appointment_id').optional({ values: 'falsy' }).isMongoId().withMessage('Appointment ID must be valid'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { barber_id, service_id, appointment_id, rating, comment } = req.body;
    const customerId = req.user._id || req.user.id;

    if (!customerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const barber = await User.findOne({ 
      _id: barber_id, 
      role: 'barber',
      admin_id: req.shop_id 
    });
    if (!barber) {
      return res.status(400).json({ success: false, error: 'Invalid barber at your shop' });
    }

    const service = await Service.findOne({ 
      _id: service_id,
      admin_id: req.shop_id
    });
    if (!service) {
      return res.status(400).json({ success: false, error: 'Invalid service at your shop' });
    }

    let isVerified = false;
    if (appointment_id) {
      const appointment = await Appointment.findOne({
        _id: appointment_id,
        customer_id: customerId,
        barber_id,
        service_id,
        status: 'completed'
      });
      if (!appointment) {
        return res.status(400).json({ success: false, error: 'Invalid appointment or appointment not completed' });
      }
      const existingReview = await Review.findOne({ appointment_id });
      if (existingReview) {
        return res.status(400).json({ success: false, error: 'Review already exists for this appointment' });
      }
      isVerified = true;
    } else {
      const completedAppointment = await Appointment.findOne({
        customer_id: customerId,
        barber_id,
        service_id,
        status: 'completed'
      });
      isVerified = !!completedAppointment;
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const review = await Review.create({
      customer_id: customerId,
      barber_id,
      service_id,
      appointment_id: appointment_id || undefined,
      rating: ratingNum,
      comment: (comment && String(comment).trim()) || '',
      is_verified: isVerified,
      is_published: true,
      admin_id: req.shop_id
    });

    await review.populate([
      { path: 'customer_id', select: 'first_name last_name' },
      { path: 'barber_id', select: 'first_name last_name' },
      { path: 'service_id', select: 'name' }
    ]);

    res.status(201).json({ success: true, data: formatReview(review) });
  } catch (error) {
    console.error('Review create error:', error.message || error);
    next(error);
  }
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Review ID must be valid'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  body('is_published').optional().isBoolean().withMessage('is_published must be a boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    let query = { _id: req.params.id };
    if (req.user.role === 'customer') {
      query.customer_id = req.user._id || req.user.id;
    }
    if (req.shop_id) {
       query.admin_id = req.shop_id;
    }

    const review = await Review.findOne(query);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const { rating, comment, is_published } = req.body;
    if (rating !== undefined && req.user.role === 'customer') review.rating = rating;
    if (comment !== undefined && req.user.role === 'customer') review.comment = comment;
    if (is_published !== undefined && req.user.role === 'admin') review.is_published = is_published;

    await review.save();
    await review.populate([
      { path: 'customer_id', select: 'first_name last_name' },
      { path: 'barber_id', select: 'first_name last_name' },
      { path: 'service_id', select: 'name' }
    ]);

    res.status(200).json({ success: true, data: formatReview(review) });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Review ID must be valid')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    let query = { _id: req.params.id };
    if (req.user.role === 'customer') {
      query.customer_id = req.user._id || req.user.id;
    }
    if (req.shop_id) {
       query.admin_id = req.shop_id;
    }

    const review = await Review.findOneAndDelete(query);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// @desc    Get review statistics for a barber
// @route   GET /api/reviews/barber/:barberId/stats
// @access  Public
router.get('/barber/:barberId/stats', [
  param('barberId').isMongoId().withMessage('Barber ID must be valid')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const barberId = req.params.barberId;
    const barber = await User.findOne({ 
      _id: barberId, 
      role: 'barber',
      admin_id: req.shop_id 
    });
    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber not found at your shop' });
    }

    const stats = await Review.aggregate([
      { $match: { 
        barber_id: new mongoose.Types.ObjectId(barberId), 
        is_published: true,
        ...(req.shop_id && { admin_id: new mongoose.Types.ObjectId(req.shop_id) })
      } },
      {
        $group: {
          _id: null,
          total_reviews: { $sum: 1 },
          average_rating: { $avg: '$rating' },
          five_star: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          four_star: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          three_star: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          two_star: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          one_star: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const serviceStats = await Review.aggregate([
      { $match: { 
        barber_id: new mongoose.Types.ObjectId(barberId), 
        is_published: true,
        ...(req.shop_id && { admin_id: new mongoose.Types.ObjectId(req.shop_id) })
      } },
      {
        $group: {
          _id: '$service_id',
          review_count: { $sum: 1 },
          average_rating: { $avg: '$rating' }
        }
      },
      { $sort: { review_count: -1 } },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      {
        $project: {
          service_id: '$_id',
          service_name: '$service.name',
          review_count: 1,
          average_rating: { $round: ['$average_rating', 1] }
        }
      }
    ]);

    const recentReviews = await Review.find({ 
      barber_id: barberId, 
      is_published: true,
      ...(req.shop_id && { admin_id: req.shop_id })
    })
      .populate('customer_id', 'first_name last_name')
      .populate('service_id', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const s = stats[0];
    const avgRating = s?.average_rating != null ? Number(s.average_rating) : null;
    res.status(200).json({
      success: true,
      data: {
        total_reviews: s?.total_reviews || 0,
        average_rating: (avgRating != null && !isNaN(avgRating)) ? avgRating.toFixed(1) : null,
        rating_distribution: {
          5: s?.five_star || 0,
          4: s?.four_star || 0,
          3: s?.three_star || 0,
          2: s?.two_star || 0,
          1: s?.one_star || 0
        },
        service_breakdown: serviceStats,
        recent_reviews: recentReviews.map(r => ({
          id: r._id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.createdAt,
          customer_first_name: r.customer_id?.first_name,
          customer_last_name: r.customer_id?.last_name,
          service_name: r.service_id?.name
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get review statistics for a service
// @route   GET /api/reviews/service/:serviceId/stats
// @access  Public
router.get('/service/:serviceId/stats', [
  param('serviceId').isMongoId().withMessage('Service ID must be valid')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const service = await Service.findOne({
       _id: req.params.serviceId,
       admin_id: req.shop_id
    });
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found at your shop' });
    }

    const statsForService = await Review.aggregate([
      { $match: { 
        service_id: new mongoose.Types.ObjectId(req.params.serviceId), 
        is_published: true,
        ...(req.shop_id && { admin_id: new mongoose.Types.ObjectId(req.shop_id) })
      } },
      {
        $group: {
          _id: null,
          total_reviews: { $sum: 1 },
          average_rating: { $avg: '$rating' },
          five_star: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          four_star: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          three_star: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          two_star: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          one_star: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const s = stats[0];
    const avgRating = s?.average_rating != null ? Number(s.average_rating) : null;
    res.status(200).json({
      success: true,
      data: {
        service_id: req.params.serviceId,
        service_name: service.name,
        total_reviews: s?.total_reviews || 0,
        average_rating: (avgRating != null && !isNaN(avgRating)) ? avgRating.toFixed(1) : null,
        rating_distribution: {
          5: s?.five_star || 0,
          4: s?.four_star || 0,
          3: s?.three_star || 0,
          2: s?.two_star || 0,
          1: s?.one_star || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
