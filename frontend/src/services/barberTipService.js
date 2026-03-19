import api from './api';

export const barberTipService = {
  // Give points to barber
  givePoints: async (data) => {
    const response = await api.post('/barber-tips', data);
    return response.data;
  },

  // Get tips (for barbers)
  getTips: async (params = {}) => {
    const response = await api.get('/barber-tips', { params });
    return response.data;
  }
};
