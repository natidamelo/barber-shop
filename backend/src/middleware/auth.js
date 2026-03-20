const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id)
        .select('_id first_name last_name email role status admin_id');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'No user found with this token'
        });
      }

      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'User account is not active'
        });
      }

      req.user = user;

      // ── Multi-Tenancy (Data Isolation) Logic ─────────────────────────────────
      // Determine the shop owner (tenant) for this user.
      // • admin: the shop owner (they are their own shop ID)
      // • staff/customers: linked    // Attach shop_id to request
      // For admin, it's their own ID. For staff/customer, it's their admin_id.
      // For developer, it's null (global access)
      if (user.role === 'admin') {
        req.shop_id = user._id || user.id;
      } else if (user.role === 'developer') {
        req.shop_id = null;
      } else {
        req.shop_id = user.admin_id;
      }
      // ─────────────────────────────────────────────────────────────────────────

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles.
// superadmin always has access to every protected route.
const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
          .select('first_name last_name email role status');

        if (user && user.status === 'active') {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue without user
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};