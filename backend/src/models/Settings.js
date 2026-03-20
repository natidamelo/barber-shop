const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    trim: true,
    maxlength: [100, 'Setting key cannot exceed 100 characters']
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
settingsSchema.index({ key: 1 });

// Static method to get a setting by key
settingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting
settingsSchema.statics.setSetting = async function(key, value, description = null) {
  return await this.findOneAndUpdate(
    { key },
    { value, description: description || undefined },
    { upsert: true, new: true, runValidators: true }
  );
};

// Static method to get all settings as an object
settingsSchema.statics.getAllSettings = async function() {
  const settings = await this.find({});
  const settingsObj = {};
  settings.forEach(setting => {
    settingsObj[setting.key] = setting.value;
  });
  return settingsObj;
};

module.exports = mongoose.model('Settings', settingsSchema);
