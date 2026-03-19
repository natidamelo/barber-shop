import api from './api';

export const reviewService = {
  // Get all reviews
  getReviews: async (params = {}) => {
    const response = await api.get('/reviews', { params });
    return response.data;
  },

  // Get single review
  getReview: async (id) => {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  },

  // Get barber review statistics
  getBarberStats: async (barberId) => {
    const response = await api.get(`/reviews/barber/${barberId}/stats`);
    return response.data;
  },

  // Get user's reviews (for customers)
  getMyReviews: async (params = {}) => {
    const response = await api.get('/reviews/my-reviews', { params });
    return response.data;
  },

  // Check if appointment has a review
  hasReviewForAppointment: async (appointmentId) => {
    const response = await api.get(`/reviews/appointment/${appointmentId}/has-review`);
    return response.data;
  },

  // Create new review
  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },

  // Update review
  updateReview: async (id, reviewData) => {
    const response = await api.put(`/reviews/${id}`, reviewData);
    return response.data;
  },

  // Delete review
  deleteReview: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  }
};
