import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertsService } from '../components/alerts/AlertsService';

// Hook care fetchează și refrescă alertele automат la fiecare 1 minut
export const useAlerts = () => {
  const [unclosedAlerts, setUnclosedAlerts] = useState([]);
  const [expirationAlerts, setExpirationAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshIntervalRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [unclosed, expiration] = await Promise.all([
        AlertsService.getUnclosedAlerts(),
        AlertsService.getExpirationAlerts(15),
      ]);
      setUnclosedAlerts(unclosed || []);
      setExpirationAlerts(expiration || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pe mount + setup auto-refresh la 1 minut
  useEffect(() => {
    fetchAlerts();
    refreshIntervalRef.current = setInterval(() => {
      fetchAlerts();
    }, 60000); // 1 minut

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchAlerts]);

  // Manual refresh (când rezolvi o alertă)
  const refreshAlerts = useCallback(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Total alerte nerezolvate
  const totalAlerts = unclosedAlerts.length + expirationAlerts.length;

  return {
    unclosedAlerts,
    expirationAlerts,
    totalAlerts,
    loading,
    error,
    refreshAlerts,
  };
};
