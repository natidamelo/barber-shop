require('dotenv').config();
const connectDB = require('../config/database');
const { Settings } = require('../models');

const initializeSettings = async () => {
  try {
    console.log('🔧 Initializing default settings...');
    
    // Use upsert to ensure the business name exists
    const result = await Settings.findOneAndUpdate(
      { key: 'business_name' },
      { 
        $setOnInsert: { 
          value: 'BarberPro',
          description: 'Business/Shop name displayed throughout the application'
        } 
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Business name matches: "${result.value}"`);
    console.log('✅ Settings initialization complete');
  } catch (error) {
    console.error('❌ Error initializing settings:', error.message);
  }
};

// Run if called directly
if (require.main === module) {
  connectDB().then(() => {
    initializeSettings().then(() => process.exit(0));
  });
}

module.exports = initializeSettings;
