const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const appointmentRoutes = require('./routes/appointments');
const inventoryRoutes = require('./routes/inventory');
const reviewRoutes = require('./routes/reviews');
const barberTipRoutes = require('./routes/barberTips');
const scheduleRoutes = require('./routes/schedules');
const financialRoutes = require('./routes/financial');
const settingsRoutes = require('./routes/settings');
const licenseRoutes = require('./routes/licenses');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// CORS must be before rate limiting so 429 responses include CORS headers
const isPrivateNetworkOrigin = (origin) => {
  try {
    const hostname = new URL(origin).hostname;
    return (
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    );
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins from environment variable
    const allowedOrigins = (process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, ''))
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']);
    
    // Normalize current origin
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // In development, allow localhost and private network IPs
    if (process.env.NODE_ENV === 'development') {
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        isPrivateNetworkOrigin(origin)
      ) {
        return callback(null, true);
      }
    }
    
    // If we're here, it's not explicitly allowed.
    // However, if we're in production and no origins are set, it might be safer to allow all for now 
    // OR we can just be strict. Let's be strict but log it (though we can't see logs easily, 
    // the error will be passed to next).
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - more lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/barber-tips', barberTipRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/licenses', licenseRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Barber Shop Management System API',
    version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        services: '/api/services',
        appointments: '/api/appointments',
        inventory: '/api/inventory',
        reviews: '/api/reviews',
        barberTips: '/api/barber-tips',
        schedules: '/api/schedules',
        financial: '/api/financial',
        settings: '/api/settings'
      }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const initializeSettings = require('./scripts/initSettings');
const initializeUser = require('./scripts/initUser');

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize default data (settings, developer if none exist)
    await initializeSettings();
    await initializeUser();
    
    // Developer Access Logs
    // Logs all requests made by the developer account for audit purposes
    app.use((req, res, next) => {
      if (req.user && req.user.role === 'developer') {
        console.log(`[Developer Action] ${req.method} ${req.originalUrl} by ${req.user.email}`);
      }
      next();
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const mongoose = require('mongoose');
  await mongoose.connection.close();
  console.log('Database connection closed');
  process.exit(0);
});

startServer();