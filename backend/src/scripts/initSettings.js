require('dotenv').config();
const connectDB = require('../config/database');
const { Settings } = require('../models');

const initializeSettings = async () => {
  try {
    console.log('🔧 Initializing default settings...');
    
    // Initialize business name if it doesn't exist
    const businessName = await Settings.findOne({ key: 'business_name' });
    if (!businessName) {
      await Settings.create({
        key: 'business_name',
        value: 'BarberPro',
        description: 'Business/Shop name displayed throughout the application'
      });
      console.log('✅ Default business name "BarberPro" initialized');
    } else {
      console.log('ℹ️  Business name setting already exists');
    }
    
    console.log('✅ Settings initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing settings:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  connectDB().then(() => {
    initializeSettings();
  });
}

module.exports = initializeSettings;
