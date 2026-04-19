import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { CateringService } from '../api/CateringService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';
import {
    selectSelectedDate,
    setSelectedDate,
    selectDailyOrders,
    selectOrdersDate,
    setDailyOrders
} from '../store/calendarSlice';



export const useCateringMainPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth?.user);
  const isAdmin = user?.authorityLevel === 100;

  // 1. DATA CURENTĂ (din Redux)
  const dateString = useSelector(selectSelectedDate);
  const selectedDate = useMemo(() => dayjs(dateString), [dateString]);
  const prevDateRef = useRef(dateString);

  // 2. COMENZILE CACHED (din Redux)
  const orders = useSelector(selectDailyOrders);         
  const ordersDateCached = useSelector(selectOrdersDate); 

  // State local
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [deleteGroup, setDeleteGroup] = useState(null); 

  // --- LOGICA FETCH ---
  const loadOrders = useCallback(async (force = false) => {
    if (!selectedDate.isValid()) return;
    
    const targetDateStr = selectedDate.format('YYYY-MM-DD');

    // CACHE CHECK: Dacă avem date valide, nu facem request
    if (!force && orders.length > 0 && ordersDateCached === targetDateStr) {
        return;
    }

    if (!submitting) setLoading(true);
    setError(null);
    try {
      const data = await CateringService.getDailyOrders(targetDateStr);
      dispatch(setDailyOrders({ orders: data || [], date: targetDateStr }));
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      if (!submitting) setLoading(false);
    }
  }, [selectedDate, orders.length, ordersDateCached, submitting, dispatch]);

  // --- SINCRONIZARE STABILĂ ---
  
  // A. URL -> Redux
  useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && dayjs(urlDate).isValid() && urlDate !== dateString) {
        dispatch(setSelectedDate(urlDate));
    } else if (!urlDate && dateString) {
        setSearchParams({ date: dateString }, { replace: true });
    }
  }, [searchParams]);

  // B. Redux -> URL & Fetch
  useEffect(() => {
    const currentUrlDate = searchParams.get('date');
    if (dateString && currentUrlDate !== dateString && dateString !== prevDateRef.current) {
        setSearchParams({ date: dateString }, { replace: true });
    }

    const isDateChanged = prevDateRef.current !== dateString;
    const isCacheInvalid = ordersDateCached !== dateString;

    if (isDateChanged || isCacheInvalid) {
        loadOrders(true); 
    }

    prevDateRef.current = dateString;
  }, [dateString]);


  // --- HANDLERS NAVIGARE ---
  const handleDateChange = (newDate) => {
    if (newDate && newDate.isValid()) {
        const newDateStr = newDate.format('YYYY-MM-DD');
        if (newDateStr !== dateString) {
            dispatch(setSelectedDate(newDateStr));
        }
    }
  };

  const handlePrevDay = () => handleDateChange(selectedDate.subtract(1, 'day'));
  const handleNextDay = () => handleDateChange(selectedDate.add(1, 'day'));
  
  // --- NOU: Buton Azi ---
  const handleGoToToday = () => handleDateChange(dayjs());
  // ----------------------

  const handleRefresh = () => loadOrders(true);


  // --- Grouping Logic ---
  const groupedOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const groups = {};
    orders.forEach((order) => {
      const key = order.reservationId ? `res-${order.reservationId}` : `no-res`;
      if (!groups[key]) {
        const timeVal = order.reservationStartAt || order.startAt || "";
        groups[key] = {
          id: key,
          reservationId: order.reservationId,
          reservationName: order.reservationId ? order.reservationName : "Comenzi Fără Rezervare",
          reservationNote: order.reservationNote,
          sortTime: timeVal,
          items: []
        };
      }
      const existingItem = groups[key].items.find(i => String(i.productId) === String(order.productId));
      if (existingItem) {
        existingItem.quantity += order.quantity;
      } else {
        groups[key].items.push({ ...order });
      }
    });
    return Object.values(groups).sort((a, b) => {
        const hasResA = !!a.reservationId;
        const hasResB = !!b.reservationId;
        if (hasResA && !hasResB) return -1;
        if (!hasResA && hasResB) return 1;
        if (hasResA && hasResB) {
            if (a.sortTime && b.sortTime) {
                if (a.sortTime < b.sortTime) return -1;
                if (a.sortTime > b.sortTime) return 1;
            }
            return a.reservationId - b.reservationId;
        }
        return 0;
    });
  }, [orders]);

  const isPast = selectedDate.isBefore(dayjs().startOf('day'));

  // --- MODALS HANDLERS ---
  const handleOpenAdd = () => {
    if (isPast && !isAdmin) {
      setToast({ open: true, message: 'Nu poți adăuga comenzi în trecut!', severity: 'warning' });
      return;
    }
    setEditingGroup(null);
    setOpenModal(true);
  };
  const handleEditGroup = (group) => {
    if (isPast && !isAdmin) {
      setToast({ open: true, message: 'Nu poți modifica comenzi din trecut!', severity: 'warning' });
      return;
    }
    setEditingGroup(group);
    setOpenModal(true);
  };
  const handleCloseModal = () => { setOpenModal(false); setEditingGroup(null); };

  const handleOpenDelete = (group) => {
    if (isPast && !isAdmin) {
      setToast({ open: true, message: 'Nu poți șterge comenzi din trecut!', severity: 'warning' });
      return;
    }
    setDeleteGroup(group);
  };
  const handleCloseDelete = () => setDeleteGroup(null);

  const handleConfirmDelete = async () => {
    if (!deleteGroup) return; 
    try {
      const idsToDelete = orders
        .filter(o => (deleteGroup.reservationId && o.reservationId === deleteGroup.reservationId) || (!deleteGroup.reservationId && !o.reservationId))
        .map(o => o.id);
      
      await Promise.all(idsToDelete.map(id => CateringService.delete(id)));
      setToast({ open: true, message: 'Șters cu succes!', severity: 'success' });
      loadOrders(true); 
      handleCloseDelete();
    } catch (err) {
      setToast({ open: true, message: getFriendlyErrorMessage(err), severity: 'error' });
    }
  };

  const handleSubmit = async (basketItems) => {
    if (!selectedDate.isValid()) {
      setToast({ open: true, message: 'Data invalidă!', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const dateForApi = selectedDate.format('YYYY-MM-DD');
      
      const finalItems = basketItems.map(item => ({
        ...item,
        orderDate: dateForApi,
        reservationId: editingGroup?.reservationId || null
      }));

      if (editingGroup) {
        const idsToDelete = orders
          .filter(o => (editingGroup.reservationId && o.reservationId === editingGroup.reservationId) || (!editingGroup.reservationId && !o.reservationId))
          .map(o => o.id);
          
        if (idsToDelete.length > 0) {
            await Promise.all(idsToDelete.map(id => CateringService.delete(id)));
        }
      }

      if (finalItems.length > 0) {
          await CateringService.create(finalItems);
      }

      setToast({ open: true, message: 'Salvat cu succes!', severity: 'success' });
      await loadOrders(true); 
      handleCloseModal();

    } catch (err) {
      let errorCode = err.response?.data?.message || err.message;
      if (editingGroup && errorCode === 'ERROR.CATERING_ORDER.DELETE_FORBIDDEN_PAST_DATE') {
          errorCode = 'ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE';
      }
      const msg = getFriendlyErrorMessage(errorCode);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedDate, groupedOrders, loading, error, submitting,
    openModal, editingGroup, toast,
    deleteGroup,
    handleOpenDelete, handleCloseDelete, handleConfirmDelete,
    handleDateChange, handlePrevDay, handleNextDay, handleGoToToday, handleRefresh,
    handleOpenAdd, handleEditGroup, handleCloseModal,
    handleSubmit, setToast,
    isAdmin, isPast,
  };
};