const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Service, Review } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all services
// @route   GET /api/services
// @access  Public
router.get('/', [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('active').optional().isBoolean().withMessage('Active must be a boolean'),
  query('sort').optional().isIn(['name', 'price', 'duration', 'created_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { category, active, sort = 'sort_order', order = 'asc', page = 1, limit = 10 } = req.query;
    
    let query = {};
    // ── Multi-Tenancy Filter ─────────────────────────────────────────────────
    if (req.shop_id) {
      query.admin_id = req.shop_id;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Apply filters
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    if (active !== undefined) {
      query.is_active = active === 'true';
    } else {
      // Default to active services only for public access (unless admin/developer)
      if (req.user && (req.user.role === 'admin' || req.user.role === 'developer')) {
         // show both active and inactive services to admin/developer
      } else {
        query.is_active = true;
      }
    }

    // Build sort object
    let sortObj = {};
    if (sort === 'sort_order') {
      sortObj = { sort_order: order === 'desc' ? -1 : 1, name: 1 };
    } else {
      sortObj[sort] = order === 'desc' ? -1 : 1;
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    
    const services = await Service.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get total count for pagination
    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      count: services.length,
      total: parseInt(total),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: services
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
router.get('/:id', [
  param('id').isMongoId().withMessage('Service ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Get service reviews/ratings
    const reviewStats = await Review.getServiceStats(req.params.id);
    const stats = reviewStats[0] || { averageRating: null, totalReviews: 0 };

    res.status(200).json({
      success: true,
      data: {
        ...service.toObject(),
        average_rating: stats.averageRating ? parseFloat(stats.averageRating).toFixed(1) : null,
        total_reviews: parseInt(stats.totalReviews || 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new service
// @route   POST /api/services
// @access  Private (Admin/Barber)
router.post('/', protect, authorize('admin', 'barber'), [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Service name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid positive number'),
  body('duration')
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('requirements')
    .optional()
    .isObject()
    .withMessage('Requirements must be a valid object'),
  body('shop_cut')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shop cut must be a valid positive number'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a valid positive integer')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { name, description, price, duration, category, image_url, requirements, is_active = true, sort_order = 0, shop_cut = 0 } = req.body;

    // Check if service name already exists
    const existingService = await Service.findOne({ name });
    if (existingService) {
      return res.status(400).json({
        success: false,
        error: 'Service with this name already exists'
      });
    }

    const service = await Service.create({
      name,
      description,
      price,
      duration,
      category,
      image_url,
      requirements: requirements || {},
      is_active,
      sort_order,
      shop_cut: typeof shop_cut === 'number' ? shop_cut : parseFloat(shop_cut) || 0,
      admin_id: req.shop_id || req.user._id // Ensure it's linked to the shop
    });

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Admin/Barber)
router.put('/:id', protect, authorize('admin', 'barber'), [
  param('id').isMongoId().withMessage('Service ID must be a valid MongoDB ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Service name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid positive number'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('requirements')
    .optional()
    .isObject()
    .withMessage('Requirements must be a valid object'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a valid positive integer')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const updateData = {};
    const { name, description, price, duration, category, image_url, requirements, is_active, sort_order, shop_cut } = req.body;

    if (name) {
      // Check if another service has this name
      const existingService = await Service.findOne({ 
        name, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingService) {
        return res.status(400).json({
          success: false,
          error: 'Service with this name already exists'
        });
      }
      updateData.name = name;
    }

    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (duration !== undefined) updateData.duration = duration;
    if (category !== undefined) updateData.category = category;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (shop_cut !== undefined) updateData.shop_cut = shop_cut;

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // If shop_cut was updated, recalculate commissions for all appointments with this service
    if (shop_cut !== undefined) {
      const { Appointment, User } = require('../models');
      
      // Helper function to calculate commission
      const calculateCommission = async (price, barberId, serviceId) => {
        try {
          const barber = await User.findById(barberId).select('commission_percentage role');
          if (!barber || barber.role !== 'barber') {
            return { shop_cut: 0, barber_commission: 0 };
          }

          const service = await Service.findById(serviceId).select('shop_cut');
          if (!service) {
            return { shop_cut: 0, barber_commission: 0 };
          }

          const shopCut = service.shop_cut || 0;
          const remainingAmount = Math.max(0, price - shopCut);
          const commissionPercentage = barber.commission_percentage || 0;
          const barberCommission = Math.round((remainingAmount * commissionPercentage / 100) * 100) / 100;

          return {
            shop_cut: Math.round(shopCut * 100) / 100,
            barber_commission: barberCommission
          };
        } catch (error) {
          console.error('Error calculating commission:', error);
          return { shop_cut: 0, barber_commission: 0 };
        }
      };

      // Find all appointments with this service and recalculate commissions
      const appointments = await Appointment.find({
        service_id: req.params.id,
        price: { $exists: true, $gt: 0 },
        barber_id: { $exists: true }
      });

      // Recalculate commissions asynchronously (don't block the response)
      Promise.all(
        appointments.map(async (appointment) => {
          try {
            const commission = await calculateCommission(
              appointment.price,
              appointment.barber_id,
              appointment.service_id
            );

            await Appointment.findByIdAndUpdate(appointment._id, {
              barber_commission: commission.barber_commission,
              shop_cut: commission.shop_cut
            });
          } catch (error) {
            console.error(`Error updating appointment ${appointment._id}:`, error);
          }
        })
      ).catch(err => console.error('Error recalculating commissions:', err));
    }

    res.status(200).json({
      success: true,
      data: updatedService
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Service ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Check if service has appointments
    const appointmentCount = await Appointment.countDocuments({ 
      service_id: req.params.id 
    });

    if (appointmentCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete service with existing appointments. Consider marking it as inactive instead.'
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get service categories
// @route   GET /api/services/categories
// @access  Public
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Service.distinct('category', {
      category: { $ne: null, $ne: '' },
      is_active: true,
      ...(req.shop_id && { admin_id: req.shop_id })
    });

    const categoryList = categories.filter(cat => cat && cat.trim() !== '');

    res.status(200).json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;