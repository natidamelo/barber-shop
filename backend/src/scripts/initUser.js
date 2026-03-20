require('dotenv').config();
const connectDB = require('../config/database');
const { User } = require('../models');

const initializeUser = async () => {
  try {
    console.log('🌱 Initializing default users...');
    
    // Migrate any existing superadmin to developer
    const migrationResult = await User.updateMany(
      { role: 'superadmin' },
      { role: 'developer' }
    );
    if (migrationResult.modifiedCount > 0) {
      console.log(`✅ Migrated ${migrationResult.modifiedCount} superadmin(s) to developer role`);
    }

    // Check if default developer exists
    const developer = await User.findOne({ role: 'developer' });
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
      console.log('ℹ️  Developer account already exists');
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
