const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Generate refresh token (longer expiry)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, licenseInfo = null) => {
  // Create token (MongoDB uses _id)
  const token = generateToken({ id: user._id || user.id });
  
  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Remove password from user object
  const userResponse = {
    id: user._id || user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    status: user.status,
    profile_image: user.profile_image,
    phone: user.phone,
    must_change_password: user.must_change_password || false
  };

  const body = { success: true, token, user: userResponse };
  if (licenseInfo) body.license_info = licenseInfo;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json(body);
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  sendTokenResponse
};