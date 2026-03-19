const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with more details
  console.error('❌ Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    path: req.path,
    origin: req.get('origin')
  });

  // CORS error
  if (err.message && err.message.includes('not allowed by CORS')) {
    const message = err.message;
    error = { message, statusCode: 403 };
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Database connection failed';
    error = { message, statusCode: 500 };
  }

  // Generic status code
  const statusCode = error.statusCode || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;