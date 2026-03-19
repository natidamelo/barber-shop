import api from './api';

export const scheduleService = {
  // Get all schedules
  getSchedules: async (params = {}) => {
    const response = await api.get('/schedules', { params });
    return response.data;
  },

  // Get single schedule
  getSchedule: async (id) => {
    const response = await api.get(`/schedules/${id}`);
    return response.data;
  },

  // Create new schedule
  createSchedule: async (scheduleData) => {
    const response = await api.post('/schedules', scheduleData);
    return response.data;
  },

  // Update schedule
  updateSchedule: async (id, scheduleData) => {
    const response = await api.put(`/schedules/${id}`, scheduleData);
    return response.data;
  },

  // Delete schedule
  deleteSchedule: async (id) => {
    const response = await api.delete(`/schedules/${id}`);
    return response.data;
  }
};
