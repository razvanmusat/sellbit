import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableVouchers, fetchUsedVouchers, fetchAnnulledVouchers, fetchExpiredVouchers } from '../store/customerVouchersSlice';

const getDefaultFromDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getDefaultToDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useVoucherFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  
  const { available, used, annulled, expired, loadingAvailable, loadingUsed, loadingAnnulled, loadingExpired } = useSelector((state) => state.customerVouchers);

  const filterParam = searchParams.get('filter') || '';
  const fromDateParam = searchParams.get('fromDate') || getDefaultFromDate();
  const toDateParam = searchParams.get('toDate') || getDefaultToDate();

  const [filter, setFilterState] = useState(filterParam);
  const [fromDate, setFromDate] = useState(fromDateParam);
  const [toDate, setToDate] = useState(toDateParam);

  const lastFetchParamsRef = useRef({
    availableFromDate: null,
    availableToDate: null,
    usedFromDate: null,
    usedToDate: null,
    annulledFromDate: null,
    annulledToDate: null,
    expiredFromDate: null,
    expiredToDate: null,
  });

  const setFilter = useCallback((newFilter) => {
    setFilterState(newFilter);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('filter', newFilter);
      if (newFilter === 'search') {
        newParams.delete('fromDate');
        newParams.delete('toDate');
      }
      return newParams;
    });
  }, [setSearchParams]);

  const updateDateRange = useCallback((newFromDate, newToDate) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('fromDate', newFromDate);
      newParams.set('toDate', newToDate);
      return newParams;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (filter === 'available' && fromDate && toDate) {
      const isCached = 
        lastFetchParamsRef.current.availableFromDate === fromDate &&
        lastFetchParamsRef.current.availableToDate === toDate;
      
      if (!isCached) {
        dispatch(fetchAvailableVouchers({ fromDate, toDate }));
        lastFetchParamsRef.current.availableFromDate = fromDate;
        lastFetchParamsRef.current.availableToDate = toDate;
      }
    } else if (filter === 'used' && fromDate && toDate) {
      const isCached =
        lastFetchParamsRef.current.usedFromDate === fromDate &&
        lastFetchParamsRef.current.usedToDate === toDate;

      if (!isCached) {
        dispatch(fetchUsedVouchers({ fromDate, toDate }));
        lastFetchParamsRef.current.usedFromDate = fromDate;
        lastFetchParamsRef.current.usedToDate = toDate;
      }
    } else if (filter === 'annulled' && fromDate && toDate) {
      const isCached =
        lastFetchParamsRef.current.annulledFromDate === fromDate &&
        lastFetchParamsRef.current.annulledToDate === toDate;

      if (!isCached) {
        dispatch(fetchAnnulledVouchers({ fromDate, toDate }));
        lastFetchParamsRef.current.annulledFromDate = fromDate;
        lastFetchParamsRef.current.annulledToDate = toDate;
      }
    } else if (filter === 'expired' && fromDate && toDate) {
      const isCached =
        lastFetchParamsRef.current.expiredFromDate === fromDate &&
        lastFetchParamsRef.current.expiredToDate === toDate;

      if (!isCached) {
        dispatch(fetchExpiredVouchers({ fromDate, toDate }));
        lastFetchParamsRef.current.expiredFromDate = fromDate;
        lastFetchParamsRef.current.expiredToDate = toDate;
      }
    }
  }, [filter, fromDate, toDate, dispatch]);

  const refreshVouchers = useCallback(async () => {
    lastFetchParamsRef.current = {
      availableFromDate: null,
      availableToDate: null,
      usedFromDate: null,
      usedToDate: null,
      annulledFromDate: null,
      annulledToDate: null,
      expiredFromDate: null,
      expiredToDate: null,
    };

    if (fromDate && toDate) {
      await Promise.all([
        dispatch(fetchAvailableVouchers({ fromDate, toDate })),
        dispatch(fetchUsedVouchers({ fromDate, toDate })),
        dispatch(fetchAnnulledVouchers({ fromDate, toDate })),
      ]);

      lastFetchParamsRef.current.availableFromDate = fromDate;
      lastFetchParamsRef.current.availableToDate = toDate;
      lastFetchParamsRef.current.usedFromDate = fromDate;
      lastFetchParamsRef.current.usedToDate = toDate;
      lastFetchParamsRef.current.annulledFromDate = fromDate;
      lastFetchParamsRef.current.annulledToDate = toDate;
    }
  }, [dispatch, fromDate, toDate]);

  const vouchers = useMemo(() => {
    if (filter === 'available') return available;
    if (filter === 'used') return used;
    if (filter === 'annulled') return annulled;
    if (filter === 'expired') return expired;
    return [];
  }, [filter, available, used, annulled, expired]);

  const loading = useMemo(() => {
    return loadingAvailable || loadingUsed || loadingAnnulled || loadingExpired;
  }, [loadingAvailable, loadingUsed, loadingAnnulled, loadingExpired]);

  return {
    filter,
    setFilter,
    fromDate,
    toDate,
    updateDateRange,
    vouchers,
    loading,
    refreshVouchers,
    getDefaultFromDate,
    getDefaultToDate,
  };
};
