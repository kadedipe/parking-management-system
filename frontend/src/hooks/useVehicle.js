// ============================================================================
// useVehicle Hook
// ============================================================================

import { useState, useCallback } from 'react';
import { vehicleService } from '../services/vehicle.service';

export const useVehicle = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const createVehicle = useCallback(async (vehicleData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehicleService.create(vehicleData);
      setData(response);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to create vehicle');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateVehicle = useCallback(async (id, vehicleData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehicleService.update(id, vehicleData);
      setData(response);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to update vehicle');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVehicle = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehicleService.getById(id);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to get vehicle');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteVehicle = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehicleService.delete(id);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to delete vehicle');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validatePlate = useCallback(async (plate) => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehicleService.validatePlate(plate);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to validate plate');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    data,
    createVehicle,
    updateVehicle,
    getVehicle,
    deleteVehicle,
    validatePlate,
  };
};

export default useVehicle;