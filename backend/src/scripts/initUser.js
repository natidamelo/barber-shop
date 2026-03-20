require('dotenv').config();
const connectDB = require('../config/database');
const { User } = require('../models');

const initializeUser = async () => {
  try {
    console.log('🌱 Initializing default users...');
    
    // Audit: Log all roles currently in DB
    const allUsers = await User.find({});
    const roleCounts = allUsers.reduce((acc, u) => {
       acc[u.role] = (acc[u.role] || 0) + 1;
       return acc;
    }, {});
    console.log('📊 Current User Roles:', roleCounts);

    // Migrate any existing superadmin to developer
    const migrationResult = await User.updateMany(
      { role: { $in: ['superadmin', 'super admin'] } },
      { role: 'developer', status: 'active' }
    );
    if (migrationResult.modifiedCount > 0) {
      console.log(`✅ Migrated ${migrationResult.modifiedCount} account(s) to developer role`);
    }

    // Force Developer accounts to active status
    await User.updateMany({ role: 'developer' }, { status: 'active' });
    console.log('✅ Developer accounts have been verified as active');

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
