import api from './api';

export const settingsService = {
  // Get all settings
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  // Get a specific setting by key
  getSetting: async (key) => {
    const response = await api.get(`/settings/${key}`);
    return response.data;
  },

  // Update a setting
  updateSetting: async (key, value, description = null) => {
    const response = await api.put(`/settings/${key}`, { value, description });
    return response.data;
  },

  // Get business name (convenience method)
  getBusinessName: async () => {
    try {
      const response = await api.get('/settings/business_name');
      return response.data.data?.value || 'BarberPro';
    } catch (error) {
      // If setting doesn't exist, return default
      return 'BarberPro';
    }
  },

  // Update business name (convenience method)
  updateBusinessName: async (name) => {
    const response = await api.put('/settings/business_name', {
      value: name,
      description: 'Business/Shop name displayed throughout the application'
    });
    return response.data;
  }
};
