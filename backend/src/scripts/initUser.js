require('dotenv').config();
const connectDB = require('../config/database');
const { User } = require('../models');

const initializeUser = async () => {
  try {
    console.log('🌱 Initializing default users...');
    
    // Check if developer exists
    const developer = await User.findOne({ email: 'developer@barbershop.com' });
    if (!developer) {
      await User.create({
        first_name: 'Developer',
        last_name: 'Admin',
        email: 'developer@barbershop.com',
        phone: '+1234567890',
        password: 'Admin123',
        role: 'developer',
        status: 'active',
        email_verified_at: new Date()
      });
      console.log('✅ Default developer "developer@barbershop.com" created');
    } else {
      console.log('ℹ️  Developer "developer@barbershop.com" already exists');
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
