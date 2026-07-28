// ============================================================================
// Booking Service
// ============================================================================

import api from './api';

export const bookingService = {
  create: async (data) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.post(`/bookings/${id}/cancel`);
    return response.data;
  },

  getHistory: async (params) => {
    const response = await api.get('/bookings/history', { params });
    return response.data;
  },

  getUpcoming: async () => {
    const response = await api.get('/bookings/upcoming');
    return response.data;
  },
};

export default bookingService;