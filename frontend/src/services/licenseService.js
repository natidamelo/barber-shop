import api from './api';

// Retrieve computer fingerprint stored in localStorage (set during activation)
export const getStoredLicenseKey = () => localStorage.getItem('license_key') || '';

// Save full license info after successful login
export const saveLicenseInfo = (info) => {
  if (info) localStorage.setItem('license_info', JSON.stringify(info));
};

// Get saved license info
export const getStoredLicenseInfo = () => {
  try {
    const raw = localStorage.getItem('license_info');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

// Clear license info on logout
export const clearLicenseInfo = () => {
  localStorage.removeItem('license_info');
};
export const getComputerId = () => {
  let id = localStorage.getItem('computer_id');
  if (!id) {
    // Generate a stable pseudo-ID based on browser/machine properties
    const nav = window.navigator;
    const raw = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency || '',
      nav.platform || ''
    ].join('|');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    id = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    localStorage.setItem('computer_id', id);
  }
  return id;
};

export const licenseService = {
  // Admin: list all licenses
  getAll: async (params = {}) => {
    const response = await api.get('/licenses', { params });
    return response.data;
  },

  // Admin: generate new license
  generate: async (data) => {
    const response = await api.post('/licenses/generate', data);
    return response.data;
  },

  // Admin: renew license by 1 year
  renew: async (id) => {
    const response = await api.put(`/licenses/${id}/renew`);
    return response.data;
  },

  // Admin: update license status
  updateStatus: async (id, status) => {
    const response = await api.put(`/licenses/${id}/status`, { status });
    return response.data;
  },

  // Admin: delete license
  deleteLicense: async (id) => {
    const response = await api.delete(`/licenses/${id}`);
    return response.data;
  },

  // Public: activate license (bind to this computer)
  activate: async (license_key) => {
    const computer_id = getComputerId();
    const response = await api.post('/licenses/activate', { license_key, computer_id });
    if (response.data.success) {
      localStorage.setItem('license_key', license_key.toUpperCase());
    }
    return response.data;
  },

  // Public: validate license (called on every login)
  validate: async (license_key) => {
    const computer_id = getComputerId();
    const response = await api.post('/licenses/validate', { license_key, computer_id });
    return response.data;
  }
};
