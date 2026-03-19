require('dotenv').config();
const connectDB = require('../config/database');
const { User } = require('../models');

const initializeUser = async () => {
  try {
    console.log('🌱 Initializing default users...');
    
    // Check if any users exist
    const count = await User.countDocuments();
    if (count === 0) {
      await User.create({
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@barbershop.com',
        phone: '+1234567890',
        password: 'Admin123',
        role: 'superadmin',
        status: 'active',
        email_verified_at: new Date()
      });
      console.log('✅ Default superadmin "admin@barbershop.com" created');
    } else {
      console.log('ℹ️  Users already exist, skipping initialization');
    }
    
    console.log('✅ User initialization complete');
  } catch (error) {
    console.error('❌ Error initializing users:', error);
  }
};

// Run if called directly
if (require.main === module) {
  connectDB().then(() => {
    initializeUser().then(() => process.exit(0));
  });
}

module.exports = initializeUser;
