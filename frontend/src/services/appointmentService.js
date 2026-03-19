import api from './api';

export const appointmentService = {
  // Get all appointments
  getAppointments: async (params = {}) => {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  // Get single appointment
  getAppointment: async (id) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  // Create new appointment
  createAppointment: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },

  // Update appointment
  updateAppointment: async (id, appointmentData) => {
    const response = await api.put(`/appointments/${id}`, appointmentData);
    return response.data;
  },

  // Delete appointment
  deleteAppointment: async (id) => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  },

  // Get available time slots
  getAvailableSlots: async (barberId, date, serviceId) => {
    const params = serviceId ? { service_id: serviceId } : {};
    const response = await api.get(`/appointments/available-slots/${barberId}/${date}`, { params });
    return response.data;
  },

  // Get appointments by date range (optional limit for dashboard - default high to get all in range)
  getAppointmentsByDateRange: async (startDate, endDate, limit = 500) => {
    const response = await api.get('/appointments', {
      params: { 
        start_date: startDate,
        end_date: endDate,
        limit
      }
    });
    return response.data;
  },

  // Get walk-in availability
  getWalkInAvailability: async (serviceId) => {
    const params = serviceId ? { service_id: serviceId } : {};
    const response = await api.get('/appointments/walk-in-availability', { params });
    return response.data;
  }
};