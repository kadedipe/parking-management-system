// ============================================================================
// Parking Service
// ============================================================================

import api from './api';

export const parkingService = {
  search: async (params) => {
    const response = await api.get('/parking/search', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/parking/spots/${id}`);
    return response.data;
  },

  reserve: async (spotId, data) => {
    const response = await api.post(`/parking/spots/${spotId}/reserve`, data);
    return response.data;
  },

  getAvailable: async (params) => {
    const response = await api.get('/parking/available', { params });
    return response.data;
  },
};

export default parkingService;