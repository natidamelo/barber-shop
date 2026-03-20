const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Settings } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all settings
// @route   GET /api/settings
// @access  Public (for business name, etc.)
router.get('/', async (req, res, next) => {
  try {
    const { shop_id } = req.query;
    let query = {};
    if (shop_id) {
       query.admin_id = shop_id;
    } else if (req.shop_id) {
       query.admin_id = req.shop_id;
    }

    const settings = await Settings.find(query);
    
    // Convert to object format
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.status(200).json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get a specific setting by key
// @route   GET /api/settings/:key
// @access  Public
router.get('/:key', [
  param('key').trim().notEmpty().withMessage('Setting key is required')
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

    const { shop_id } = req.query;
    let query = { key: req.params.key };
    if (shop_id) {
       query.admin_id = shop_id;
    } else if (req.shop_id) {
       query.admin_id = req.shop_id;
    }

    const setting = await Settings.findOne(query);

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        key: setting.key,
        value: setting.value,
        description: setting.description
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update a setting
// @route   PUT /api/settings/:key
// @access  Private (Admin only)
router.put('/:key', protect, authorize('admin'), [
  param('key').trim().notEmpty().withMessage('Setting key is required'),
  body('value')
    .notEmpty()
    .withMessage('Setting value is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
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

    const { value, description } = req.body;

    const setting = await Settings.findOneAndUpdate(
      { 
        key: req.params.key,
        admin_id: req.shop_id 
      },
      { 
        value,
        ...(description !== undefined && { description }),
        admin_id: req.shop_id
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        key: setting.key,
        value: setting.value,
        description: setting.description
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
