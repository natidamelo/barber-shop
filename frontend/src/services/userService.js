import api from './api';

export const userService = {
  // Get all users (admin only)
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Get all barbers
  getBarbers: async () => {
    const response = await api.get('/users/barbers');
    return response.data;
  },

  // Get single user
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Update user
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Reset user password (admin/receptionist)
  resetPassword: async (id) => {
    const response = await api.post(`/users/${id}/reset-password`);
    return response.data;
  },

  // Get user statistics
  getUserStats: async (id) => {
    const response = await api.get(`/users/${id}/stats`);
    return response.data;
  },

  // Get customers only
  getCustomers: async (params = {}) => {
    const response = await api.get('/users', { 
      params: { ...params, role: 'customer' } 
    });
    return response.data;
  },

  // Create new user (Admin/Receptionist only)
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Upload profile image file (returns profile_image_url)
  uploadProfileImage: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/users/upload-profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};