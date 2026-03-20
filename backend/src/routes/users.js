const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult, param, query } = require('express-validator');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { User, Review, Appointment, BarberTip } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads/profile directory exists
const profileUploadDir = path.join(process.cwd(), 'uploads', 'profile');
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => {
    const ext = (file.mimetype === 'image/jpeg' || file.originalname.toLowerCase().endsWith('.jpg')) ? '.jpg'
      : (file.mimetype === 'image/png' || file.originalname.toLowerCase().endsWith('.png')) ? '.png'
      : (file.mimetype === 'image/webp' || file.originalname.toLowerCase().endsWith('.webp')) ? '.webp'
      : path.extname(file.originalname) || '.jpg';
    cb(null, `profile-${uuidv4()}${ext}`);
  }
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'), false);
    }
  }
});

// @desc    Upload profile image (returns URL to use as profile_image)
// @route   POST /api/users/upload-profile-image
// @access  Private (Admin, Receptionist)
router.post('/upload-profile-image', protect, authorize('admin', 'receptionist'), uploadProfileImage.single('photo'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded. Use field name "photo".' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const profileImageUrl = `${baseUrl}/uploads/profile/${req.file.filename}`;
  res.status(200).json({
    success: true,
    profile_image_url: profileImageUrl
  });
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 5MB.' });
    }
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
  }
  next(err);
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, Receptionist, Developer)
router.get('/', protect, authorize('admin', 'receptionist', 'developer'), [
  query('role').optional().isIn(['admin', 'barber', 'customer', 'receptionist', 'washer']).withMessage('Invalid role'),
  query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  query('search').optional().isString().withMessage('Search must be a string')
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

    const { role, status, search, page = 1, limit = 10 } = req.query;
    
    let query = {};

    // ── Base Isolation Filters ──────────────────────────────────────────────
    const andFilters = [];

    // developer accounts are never visible to non-developer users
    if (req.user.role !== 'developer') {
      andFilters.push({ role: { $ne: 'developer' } });
    }

    // Tenancy Filter
    if (req.shop_id) {
       // An admin/shop owner should see themselves AND their staff
       andFilters.push({
         $or: [
           { admin_id: req.shop_id },
           { _id: req.shop_id }
         ]
       });
    }

    // ── User-provided Filters ────────────────────────────────────────────────
    if (role) {
      andFilters.push({ role });
    }

    if (status) {
      andFilters.push({ status });
    }

    if (search) {
      andFilters.push({
        $or: [
          { first_name: new RegExp(search, 'i') },
          { last_name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ]
      });
    }

    // Final Query
    const query = andFilters.length > 0 ? { $and: andFilters } : {};
    // ─────────────────────────────────────────────────────────────────────────

    // Apply pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('first_name last_name email phone role status profile_image commission_percentage wash_after_cut washer_id barber_id createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: parseInt(total),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all barbers
// @route   GET /api/users/barbers
// @access  Public
router.get('/barbers', [
  query('shop_id').optional().isMongoId().withMessage('Shop ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    const { shop_id } = req.query;
    
    // Scoped query for barbers
    let query = { role: 'barber', status: 'active' };
    if (shop_id) {
       query.admin_id = shop_id;
    } else if (req.shop_id) {
       query.admin_id = req.shop_id;
    }

    const barbers = await User.find(query)
      .select('first_name last_name email phone profile_image bio')
      .sort({ first_name: 1 });

    // Get ratings for each barber
    const barbersWithRatings = await Promise.all(
      barbers.map(async (barber) => {
        const ratingStats = await Review.getBarberStats(barber._id);
        const stats = ratingStats[0] || { averageRating: null, totalReviews: 0 };

        return {
          ...barber.toObject(),
          average_rating: stats.averageRating ? parseFloat(stats.averageRating).toFixed(1) : null,
          total_reviews: parseInt(stats.totalReviews || 0)
        };
      })
    );

    res.status(200).json({
      success: true,
      count: barbersWithRatings.length,
      data: barbersWithRatings
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new user (Admin/Receptionist only)
// @route   POST /api/users
// @access  Private (Admin, Receptionist, Developer)
router.post('/', protect, authorize('admin', 'receptionist', 'developer'), [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),
  body('role')
    .optional()
    .isIn(['admin', 'customer', 'barber', 'receptionist', 'washer'])
    .withMessage('Invalid role'),
  body('wash_after_cut')
    .optional()
    .isBoolean()
    .withMessage('Wash after cut must be true or false'),
  body('washer_id')
    .optional({ checkFalsy: true, nullable: true })
    .isMongoId()
    .withMessage('Washer ID must be a valid MongoDB ID'),
  body('barber_id')
    .optional({ checkFalsy: true, nullable: true })
    .isMongoId()
    .withMessage('Barber ID must be a valid MongoDB ID'),
  body('profile_image')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 500 })
    .withMessage('Profile image URL cannot exceed 500 characters')
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

    const { first_name, last_name, email, password, phone, role = 'customer', commission_percentage, wash_after_cut, washer_id, barber_id, profile_image } = req.body;

    // Receptionist can only create customers
    if (req.user.role === 'receptionist' && role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Receptionist can only create customer accounts'
      });
    }

    // Only developer can create admin accounts
    if (role === 'admin' && req.user.role !== 'developer') {
      return res.status(403).json({
        success: false,
        error: 'Only the developer can create admin accounts'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Generate a temporary password if not provided
    // Format: Customer[First3Letters][Last3Letters][Random3Digits]
    // Example: CustomerJohDoe123
    const generateTempPassword = () => {
      const first3 = first_name.substring(0, 3).padEnd(3, 'X').toLowerCase();
      const last3 = last_name.substring(0, 3).padEnd(3, 'X').toLowerCase();
      const random3 = Math.floor(100 + Math.random() * 900); // 100-999
      return `Customer${first3}${last3}${random3}`;
    };

    const finalPassword = password || generateTempPassword();

    // Determine the assigned role
    const assignedRole = (() => {
      const isPrivileged = req.user.role === 'admin' || req.user.role === 'developer' || req.user.role === 'superadmin';
      if (role === 'admin' && (req.user.role === 'developer' || req.user.role === 'superadmin')) return 'admin';
      if (role === 'receptionist' && isPrivileged) return 'receptionist';
      if (role === 'barber' && isPrivileged) return 'barber';
      if (role === 'washer' && isPrivileged) return 'washer';
      return 'customer';
    })();

    // Create user (password will be hashed by the pre-save middleware)
    const userData = {
      first_name,
      last_name,
      email,
      password: finalPassword,
      phone,
      role: assignedRole,
      status: 'active',
      email_verified_at: new Date(),
      must_change_password: !password,
      // Link this user to the admin who created them (for license lookup on login)
      admin_id: req.user.role === 'admin' ? (req.user._id || req.user.id) : null
    };
    
    // Add commission_percentage if creating a barber and it's provided
    if (assignedRole === 'barber' && (req.user.role === 'admin' || req.user.role === 'developer') && commission_percentage !== undefined) {
      if (commission_percentage < 0 || commission_percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Commission percentage must be between 0 and 100'
        });
      }
      userData.commission_percentage = commission_percentage;
    }

    // Add wash_after_cut, washer_id, barber_id for customers
    if (assignedRole === 'customer') {
      if (wash_after_cut !== undefined) userData.wash_after_cut = !!wash_after_cut;
      if (washer_id) userData.washer_id = washer_id;
      if (barber_id) userData.barber_id = barber_id;
    }

    if (profile_image != null && String(profile_image).trim() !== '') {
      userData.profile_image = String(profile_image).trim();
    }

    const user = await User.create(userData);

    // Return user without password, but include temp password info if generated
    const userResponse = user.toObject();
    delete userResponse.password;
    
    // If password was auto-generated, include a note
    if (!password) {
      userResponse.temp_password = finalPassword;
      userResponse.password_generated = true;
    }

    res.status(201).json({
      success: true,
      data: userResponse,
      message: password ? 'Customer created successfully' : 'Customer created with temporary password'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('User ID must be a valid MongoDB ID')
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

    let user = await User.findOne({
      _id: req.params.id,
      ...(req.shop_id && { 
        $or: [
          { admin_id: req.shop_id }, 
          { _id: req.shop_id }
        ] 
      })
    }).select('first_name last_name email phone role status profile_image bio preferences commission_percentage wash_after_cut washer_id barber_id createdAt email_verified_at');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // developer profile is invisible to everyone except developer
    if (user.role === 'developer' && req.user.role !== 'developer') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Users can only view their own profile, admins/receptionist can view any
    const userId = req.user._id || req.user.id;
    if (req.user.role !== 'admin' && req.user.role !== 'receptionist' && req.user.role !== 'developer' && user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this user'
      });
    }

    // For barbers, get their ratings
    if (user.role === 'barber') {
      const ratingStats = await Review.aggregate([
        { $match: { barber_id: user._id, is_published: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ]);

      const stats = ratingStats[0] || { averageRating: null, totalReviews: 0 };
      user.average_rating = stats.averageRating ? parseFloat(stats.averageRating).toFixed(1) : null;
      user.total_reviews = parseInt(stats.totalReviews || 0);

      // Get recent reviews
      const recentReviews = await Review.find({ 
        barber_id: user._id, 
        is_published: true 
      })
      .populate('customer_id', 'first_name last_name')
      .populate('service_id', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('rating comment createdAt');

      user.recent_reviews = recentReviews;
    }

    // For customers, populate washer and barber names when set
    if (user.role === 'customer') {
      user = user.toObject ? user.toObject() : user;
      if (user.washer_id) {
        const washer = await User.findById(user.washer_id).select('first_name last_name').lean();
        user.washer_name = washer ? `${washer.first_name} ${washer.last_name}` : null;
      }
      if (user.barber_id) {
        const barber = await User.findById(user.barber_id).select('first_name last_name').lean();
        user.barber_name = barber ? `${barber.first_name} ${barber.last_name}` : null;
      }
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('User ID must be a valid MongoDB ID'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('phone')
    .optional({ checkFalsy: true, nullable: true })
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),
  body('bio')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'barber', 'customer', 'receptionist', 'washer', 'developer'])
    .withMessage('Invalid role'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be a valid object'),
  body('commission_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission percentage must be between 0 and 100'),
  body('wash_after_cut')
    .optional()
    .isBoolean()
    .withMessage('Wash after cut must be true or false'),
  body('washer_id')
    .optional({ checkFalsy: true, nullable: true })
    .isMongoId()
    .withMessage('Washer ID must be a valid MongoDB ID'),
  body('barber_id')
    .optional({ checkFalsy: true, nullable: true })
    .isMongoId()
    .withMessage('Barber ID must be a valid MongoDB ID'),
  body('profile_image')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 500 })
    .withMessage('Profile image URL cannot exceed 500 characters'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
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

    const user = await User.findOne({
      _id: req.params.id,
      ...(req.shop_id && { 
        $or: [
          { admin_id: req.shop_id }, 
          { _id: req.shop_id }
        ] 
      })
    }).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // developer profile cannot be edited by non-developer
    if (user.role === 'developer' && req.user.role !== 'developer') {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Users can only edit their own profile, admins/receptionist can edit any
    const userId = req.user._id || req.user.id;
    if (req.user.role !== 'admin' && req.user.role !== 'receptionist' && req.user.role !== 'developer' && user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to edit this user'
      });
    }

    const updateData = {};
    const { first_name, last_name, phone, bio, role, status, preferences, commission_percentage, wash_after_cut, washer_id, barber_id, profile_image, password } = req.body;

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (profile_image !== undefined) updateData.profile_image = profile_image && profile_image.trim() !== '' ? profile_image.trim() : null;
    if (preferences !== undefined) updateData.preferences = preferences;
    if (wash_after_cut !== undefined) updateData.wash_after_cut = !!wash_after_cut;
    if (washer_id !== undefined) updateData.washer_id = washer_id || null;
    if (barber_id !== undefined) updateData.barber_id = barber_id || null;

    // Only admins or developer can change role, status, and commission_percentage
    if (req.user.role === 'admin' || req.user.role === 'developer') {
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (commission_percentage !== undefined) {
        // Validate commission_percentage (allow null)
        if (commission_percentage !== null && (isNaN(commission_percentage) || commission_percentage < 0 || commission_percentage > 100)) {
          return res.status(400).json({
            success: false,
            error: 'Commission percentage must be between 0 and 100'
          });
        }
        // Only set commission_percentage for barbers (using user instance directly)
        if (user.role === 'barber' || role === 'barber') {
          user.commission_percentage = commission_percentage;
        }
      }
    }

    // Apply all updateData to user instance
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });

    if (password !== undefined && password.trim() !== '') {
      user.password = password.trim();
    }

    // Save changes (this triggers pre-save hooks like password hashing)
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Reset user password (admin/receptionist)
// @route   POST /api/users/:id/reset-password
// @access  Private (Admin, Receptionist, Developer)
router.post('/:id/reset-password', protect, authorize('admin', 'receptionist', 'developer'), [
  param('id').isMongoId().withMessage('User ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const targetUser = await User.findOne({
       _id: req.params.id,
       ...(req.shop_id && { 
         $or: [
           { admin_id: req.shop_id }, 
           { _id: req.shop_id }
         ] 
       })
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // developer password cannot be reset from here
    if (targetUser.role === 'developer') {
      return res.status(403).json({
        success: false,
        error: 'This account password cannot be reset from this screen'
      });
    }

    // Receptionist can only reset customer passwords
    if (req.user.role === 'receptionist' && targetUser.role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Receptionist can only reset passwords for customers'
      });
    }

    // Generate a simple temporary password (8-10 chars, mixed)
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      let pwd = '';
      for (let i = 0; i < 10; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pwd;
    };

    const tempPassword = generateTempPassword();

    targetUser.password = tempPassword;
    targetUser.must_change_password = true;
    targetUser.reset_password_token = null;
    targetUser.reset_password_expires = null;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'Temporary password generated successfully',
      temp_password: tempPassword
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin, Developer)
router.delete('/:id', protect, authorize('admin', 'developer'), [
  param('id').isMongoId().withMessage('User ID must be a valid MongoDB ID')
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

    const userId = req.user._id || req.user.id;
    const targetUserId = req.params.id;

    // Cannot delete self
    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      ...(req.shop_id && { 
        $or: [
          { admin_id: req.shop_id }, 
          { _id: req.shop_id }
        ] 
      })
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // developer cannot be deleted by anyone (not even themselves via this route)
    if (user.role === 'developer') {
      return res.status(403).json({
        success: false,
        error: 'This account cannot be deleted'
      });
    }

    // Check for dependencies
    const appointmentCount = await Appointment.countDocuments({
      $or: [
        { customer_id: req.params.id },
        { barber_id: req.params.id }
      ]
    });

    if (appointmentCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete user with existing appointments. Consider suspending the account instead.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
router.get('/:id/stats', protect, [
  param('id').isMongoId().withMessage('User ID must be a valid MongoDB ID')
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

    // Users can only view their own stats, admins and barbers can view relevant stats
    if (req.user.role === 'customer' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view these statistics'
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let stats = {};

    if (user.role === 'customer') {
      // Customer statistics using MongoDB aggregation
      const appointmentStats = await Appointment.aggregate([
        { $match: { customer_id: user._id } },
        {
          $group: {
            _id: null,
            total_appointments: { $sum: 1 },
            completed_appointments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled_appointments: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            total_spent: {
              $sum: {
                $cond: [
                  { $eq: ['$payment_status', 'paid'] },
                  { $ifNull: ['$price', 0] },
                  0
                ]
              }
            },
            paid_completed_total: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'completed'] },
                      { $eq: ['$payment_status', 'paid'] }
                    ]
                  },
                  { $ifNull: ['$price', 0] },
                  0
                ]
              }
            }
          }
        }
      ]);

      const statsData = appointmentStats[0] || {
        total_appointments: 0,
        completed_appointments: 0,
        cancelled_appointments: 0,
        total_spent: 0,
        paid_completed_total: 0
      };

      const totalSpent = parseFloat(statsData.total_spent || 0);
      const paidCompletedTotal = parseFloat(statsData.paid_completed_total || 0);
      const earnedPoints = Math.floor(paidCompletedTotal / 10);

      const pointsGivenResult = await BarberTip.aggregate([
        { $match: { customer_id: user._id } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]);
      const pointsGiven = pointsGivenResult[0]?.total || 0;
      const loyalty_points = Math.max(0, earnedPoints - pointsGiven);

      stats = {
        total_appointments: statsData.total_appointments || 0,
        completed_appointments: statsData.completed_appointments || 0,
        cancelled_appointments: statsData.cancelled_appointments || 0,
        total_spent: totalSpent,
        loyalty_points,
        points_earned: earnedPoints,
        points_given: pointsGiven
      };

      // Favorite barber
      const favoriteBarber = await Appointment.aggregate([
        { $match: { customer_id: user._id, status: 'completed' } },
        {
          $group: {
            _id: '$barber_id',
            appointment_count: { $sum: 1 }
          }
        },
        { $sort: { appointment_count: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'barber'
          }
        },
        { $unwind: '$barber' },
        {
          $project: {
            _id: 1,
            appointment_count: 1,
            first_name: '$barber.first_name',
            last_name: '$barber.last_name'
          }
        }
      ]);

      if (favoriteBarber.length > 0) {
        const barber = favoriteBarber[0];
        stats.favorite_barber = {
          id: barber._id,
          name: `${barber.first_name} ${barber.last_name}`,
          appointment_count: barber.appointment_count
        };
      }

    } else if (user.role === 'barber') {
      // Barber statistics using MongoDB aggregation
      const appointmentStats = await Appointment.aggregate([
        { $match: { barber_id: user._id } },
        {
          $group: {
            _id: null,
            total_appointments: { $sum: 1 },
            completed_appointments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled_appointments: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            total_earnings: {
              $sum: {
                $cond: [
                  { $eq: ['$payment_status', 'paid'] },
                  { $ifNull: ['$price', 0] },
                  0
                ]
              }
            }
          }
        }
      ]);

      const reviewStats = await Review.aggregate([
        { $match: { barber_id: user._id, is_published: true } },
        {
          $group: {
            _id: null,
            total_reviews: { $sum: 1 },
            average_rating: { $avg: '$rating' }
          }
        }
      ]);

      const appointmentData = appointmentStats[0] || {
        total_appointments: 0,
        completed_appointments: 0,
        cancelled_appointments: 0,
        total_earnings: 0
      };

      const reviewData = reviewStats[0] || {
        total_reviews: 0,
        average_rating: null
      };

      const barberPointsResult = await BarberTip.aggregate([
        { $match: { barber_id: user._id } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]);
      const barber_points_received = barberPointsResult[0]?.total || 0;

      stats = {
        total_appointments: appointmentData.total_appointments || 0,
        completed_appointments: appointmentData.completed_appointments || 0,
        cancelled_appointments: appointmentData.cancelled_appointments || 0,
        total_earnings: parseFloat(appointmentData.total_earnings || 0),
        total_reviews: reviewData.total_reviews || 0,
        average_rating: reviewData.average_rating ? parseFloat(reviewData.average_rating).toFixed(1) : null,
        barber_points_received
      };

      // Most popular service
      const popularService = await Appointment.aggregate([
        { $match: { barber_id: user._id, status: 'completed' } },
        {
          $group: {
            _id: '$service_id',
            booking_count: { $sum: 1 }
          }
        },
        { $sort: { booking_count: -1 } },
        { $limit: 1 },
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
            _id: 1,
            booking_count: 1,
            name: '$service.name'
          }
        }
      ]);

      if (popularService.length > 0) {
        const service = popularService[0];
        stats.most_popular_service = {
          id: service._id,
          name: service.name,
          booking_count: service.booking_count
        };
      }
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;