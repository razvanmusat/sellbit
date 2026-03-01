import { useState } from 'react';
import dayjs from 'dayjs';
import { ReservationsService } from '../api/ReservationsService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useReservationsInterval = () => {
  const [intervalReservations, setIntervalReservations] = useState([]);
  const [loadingInterval, setLoadingInterval] = useState(false);
  const [intervalError, setIntervalError] = useState(null);

  const fetchReservationsInterval = async (start, end) => {
    setLoadingInterval(true);
    setIntervalError(null);
    try {
      const data = await ReservationsService.getByInterval(start, end);
      setIntervalReservations(data || []);
    } catch (err) {
      setIntervalError(getFriendlyErrorMessage(err));
    } finally {
      setLoadingInterval(false);
    }
  };

  return {
    intervalReservations,
    loadingInterval,
    intervalError,
    fetchReservationsInterval,
  };
};
