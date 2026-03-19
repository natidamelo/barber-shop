const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, License } = require('../models');
const { sendTokenResponse } = require('../utils/jwt');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number')
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

    const { first_name, last_name, email, password, phone, role = 'customer' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user (password will be hashed by the pre-save middleware)
    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      phone,
      role: ['admin', 'barber', 'customer', 'receptionist'].includes(role) ? role : 'customer', // superadmin only via seed/direct DB
      status: 'active'
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.'
      });
    }

    // Check password using the User model method
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // ── License check ─────────────────────────────────────────────────────────
    // License model: 1 license = 1 shop.
    //   • superadmin  → no license needed (developer/seller)
    //   • admin       → must provide license_key + computer_id on login
    //   • all others  → license is looked up from their shop admin automatically
    let licenseInfo = null;

    if (user.role !== 'superadmin') {
      const { computer_id } = req.body;
      let licenseKey;

      if (user.role === 'admin') {
        // Admin provides their own license key
        licenseKey = req.body.license_key;

        if (!licenseKey || !computer_id) {
          return res.status(403).json({
            success: false,
            error: 'License key and computer ID are required to log in.',
            require_license: true
          });
        }
      } else {
        // Staff (barber, receptionist, customer, washer):
        // Find their shop admin and use the admin's stored license key
        if (!computer_id) {
          return res.status(403).json({
            success: false,
            error: 'Computer ID is required.',
            require_license: true
          });
        }

        // Look up the admin this user belongs to
        let adminUser = null;
        if (user.admin_id) {
          adminUser = await User.findById(user.admin_id).select('license_key role status');
        }
        // Fallback: find any active admin in the system (single-shop setup)
        if (!adminUser) {
          adminUser = await User.findOne({ role: 'admin', status: 'active' }).select('license_key role');
        }

        if (!adminUser || !adminUser.license_key) {
          return res.status(403).json({
            success: false,
            error: 'Your shop does not have an active license. Please contact your administrator.',
            require_license: true
          });
        }

        licenseKey = adminUser.license_key;
      }

      // Validate the license
      const license = await License.findOne({ license_key: licenseKey.toUpperCase() });

      if (!license) {
        return res.status(403).json({ success: false, error: 'Invalid license key.', require_license: true });
      }

      if (license.status === 'suspended') {
        return res.status(403).json({ success: false, error: 'Your shop license has been suspended. Contact support.', require_license: true });
      }

      if (license.computer_id && license.computer_id !== computer_id) {
        return res.status(403).json({ success: false, error: 'License is bound to a different computer.', require_license: true });
      }

      const now = new Date();
      if (license.expire_date < now) {
        await License.findByIdAndUpdate(license._id, { status: 'expired' });
        return res.status(403).json({
          success: false,
          error: `Your shop license expired on ${license.expire_date.toLocaleDateString()}. Please renew.`,
          require_license: true,
          expire_date: license.expire_date
        });
      }

      // Bind computer if not yet bound
      if (!license.computer_id) {
        license.computer_id = computer_id;
        license.status = 'active';
        license.activated_at = license.activated_at || now;
      }
      license.last_checked_at = now;
      await license.save();

      // If admin: store the license key on their account for staff to reuse
      if (user.role === 'admin' && user.license_key !== license.license_key) {
        await User.findByIdAndUpdate(user._id, { license_key: license.license_key });
      }

      // Build license info to return to frontend
      const daysRemaining = Math.ceil((license.expire_date - now) / (1000 * 60 * 60 * 24));
      licenseInfo = {
        license_key: license.license_key,
        expire_date: license.expire_date,
        days_remaining: daysRemaining,
        is_new_activation: !license.activated_at || (now - license.activated_at) < 5000
      };
    }
    // ─────────────────────────────────────────────────────────────────────────

    sendTokenResponse(user, 200, res, licenseInfo);
  } catch (error) {
    next(error);
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('first_name last_name email role status phone profile_image bio preferences must_change_password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters'),
  body('profile_image')
    .optional()
    .isString()
    .isLength({ max: 500000 })
    .withMessage('Profile image data too large')
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

    const { first_name, last_name, phone, bio, preferences, profile_image } = req.body;
    
    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (preferences) updateData.preferences = preferences;
    if (profile_image !== undefined) updateData.profile_image = profile_image;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('first_name last_name email role status phone profile_image bio preferences must_change_password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
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

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    user.must_change_password = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

module.exports = router;