import api from './api';

export const serviceService = {
  // Get all services
  getServices: async (params = {}) => {
    const response = await api.get('/services', { params });
    return response.data;
  },

  // Get single service
  getService: async (id) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  // Create new service
  createService: async (serviceData) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },

  // Update service
  updateService: async (id, serviceData) => {
    const response = await api.put(`/services/${id}`, serviceData);
    return response.data;
  },

  // Delete service
  deleteService: async (id) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  },

  // Get service categories
  getCategories: async () => {
    const response = await api.get('/services/categories');
    return response.data;
  },

  // Get active services only
  getActiveServices: async () => {
    const response = await api.get('/services', { params: { active: true } });
    return response.data;
  }
};