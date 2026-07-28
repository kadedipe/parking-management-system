// ============================================================================
// useBooking Hook
// ============================================================================

import { useState, useCallback } from 'react';
import { bookingService } from '../services/booking.service';

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const createBooking = useCallback(async (bookingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.create(bookingData);
      setData(response);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to create booking');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBooking = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.getById(id);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to get booking');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelBooking = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.cancel(id);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to cancel booking');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    data,
    createBooking,
    getBooking,
    cancelBooking,
  };
};

export default useBooking;