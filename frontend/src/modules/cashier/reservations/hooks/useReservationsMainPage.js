import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchReservations, setSelectedDate } from '../store/reservationsSlice';
import { ReservationsService } from '../api/ReservationsService';
import { CateringService } from '../../catering/api/CateringService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';
import { invalidateDailyOrders } from '../../catering/store/calendarSlice';

export const useReservationsMainPage = () => {
  const navigate = useNavigate(); 
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- REDUX STATE ---
  const { 
    selectedDate: selectedDateStr, 
    reservations, 
    loading: loadingList, 
    error: listError 
  } = useSelector((state) => state.reservations);

  const selectedDate = useMemo(() => dayjs(selectedDateStr), [selectedDateStr]);
  const prevDateRef = useRef(selectedDateStr);

  // --- LOCAL STATE ---
  const [openModal, setOpenModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [deleteId, setDeleteId] = useState(null); 
  const [cateringModalOpen, setCateringModalOpen] = useState(false);
  const [reservationForCatering, setReservationForCatering] = useState(null);
  const [cateringConflict, setCateringConflict] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // --- LOGICA FETCH ---
  const loadData = useCallback((force = false) => {
    if (!selectedDateStr) return;
    if (!force && !listError && !loadingList && reservations && reservations.length > 0) {
        return; 
    }
    dispatch(fetchReservations(selectedDateStr));
  }, [dispatch, selectedDateStr, listError, loadingList, reservations]);


  // --- ARHITECTURA URL-FIRST ---

  // 1. URL -> REDUX
  useEffect(() => {
    const urlDate = searchParams.get('date');
    
    if (urlDate && dayjs(urlDate).isValid()) {
        if (urlDate !== selectedDateStr) {
            dispatch(setSelectedDate(urlDate));
        }
    } else {
        if (selectedDateStr) {
            setSearchParams({ date: selectedDateStr }, { replace: true });
        }
    }
  }, [searchParams]); 


  // 2. REDUX UPDATE TRIGGER
  useEffect(() => {
    const isDateChanged = prevDateRef.current !== selectedDateStr;
    loadData(isDateChanged); 
    prevDateRef.current = selectedDateStr;
  }, [selectedDateStr]); 


  // --- HANDLERS NAVIGARE ---
  const handleChangeDate = (newDate) => {
    const dateStr = newDate ? newDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    setSearchParams({ date: dateStr });
  };

  const handlePrevDay = () => handleChangeDate(selectedDate.subtract(1, 'day'));
  const handleNextDay = () => handleChangeDate(selectedDate.add(1, 'day'));
  const handleGoToToday = () => handleChangeDate(dayjs());
  const handleRefresh = () => loadData(true);

  // --- MODAL HANDLERS ---
  const handleOpenAdd = () => {
    if (selectedDate.isBefore(dayjs().startOf('day'))) {
        setToast({ open: true, message: 'Nu poți adăuga rezervări în trecut!', severity: 'warning' });
        return; 
    }
    setEditingReservation(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (reservation) => {
    if (dayjs(reservation.startAt).isBefore(dayjs().startOf('day'))) {
        setToast({ open: true, message: 'Nu poți modifica o rezervare din trecut!', severity: 'warning' });
        return;
    }
    setEditingReservation(reservation);
    setOpenModal(true);
  };

  const handleCloseModal = () => { setOpenModal(false); setEditingReservation(null); };

  const handleOpenDelete = (reservation) => {
    if (dayjs(reservation.startAt).isBefore(dayjs().startOf('day'))) {
        setToast({ open: true, message: 'Nu poți șterge o rezervare din trecut!', severity: 'warning' });
        return;
    }
    setDeleteId(reservation.id);
  };

  const handleCloseDelete = () => setDeleteId(null);

  const handleOpenCatering = async (reservation) => {
    try {
        const dateStr = dayjs(reservation.startAt).format('YYYY-MM-DD');
        const dailyOrders = await CateringService.getDailyOrders(dateStr);
        const exists = dailyOrders && dailyOrders.some(order => order.reservationId === reservation.id);
        if (exists) { setCateringConflict(reservation); return; }
        setReservationForCatering(reservation);
        setCateringModalOpen(true);
    } catch (err) {
        setToast({ open: true, message: 'Eroare la verificarea comenzilor.', severity: 'error' });
    }
  };

  const handleRedirectToCatering = () => {
      if (!cateringConflict) return;
      const dateStr = dayjs(cateringConflict.startAt).format('YYYY-MM-DD');
      navigate(`/home/catering?date=${dateStr}`);
      setCateringConflict(null);
  };

  const handleCloseConflict = () => setCateringConflict(null);
  const handleCloseCatering = () => { setCateringModalOpen(false); setReservationForCatering(null); };

  const handleSubmitCatering = async (itemsPayload) => {
    setSubmitting(true);
    try {
        await CateringService.create(itemsPayload);
        setToast({ open: true, message: 'Comanda a fost salvată!', severity: 'success' });
        handleCloseCatering();
        dispatch(invalidateDailyOrders());
    } catch (err) {
        const msg = getFriendlyErrorMessage(err.response?.data?.message || err.message);
        setToast({ open: true, message: msg, severity: 'error' });
    } finally {
        setSubmitting(false);
    }
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
        let shouldRefresh = true;
        if (editingReservation) {
            await ReservationsService.update(editingReservation.id, data);
            
            // --- MODIFICARE MAJORĂ AICI ---
            // Invalidăm comenzile ORICÂND facem update (pentru că s-a putut schimba ora, numele, nota)
            dispatch(invalidateDailyOrders()); 
            // -----------------------------

            const oldDate = dayjs(editingReservation.startAt).format('YYYY-MM-DD');
            const newDate = dayjs(data.startAt).format('YYYY-MM-DD');
            
            // Logica de redirect dacă s-a schimbat data
            if (oldDate !== newDate) {
                setSearchParams({ date: newDate });
                shouldRefresh = false; 
            }
            setToast({ open: true, message: 'Rezervare actualizată!', severity: 'success' });
        } else {
            await ReservationsService.create(data);
            setToast({ open: true, message: 'Rezervare creată!', severity: 'success' });
        }
        
        if (shouldRefresh) {
            loadData(true);
        }
        
        handleCloseModal();
    } catch (err) {
        const msg = getFriendlyErrorMessage(err.response?.data?.message || err.message);
        setToast({ open: true, message: msg, severity: 'error' });
    } finally {
        setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
        await ReservationsService.delete(deleteId);
        setToast({ open: true, message: 'Rezervare ștearsă!', severity: 'success' });
        loadData(true);
        dispatch(invalidateDailyOrders());
        handleCloseDelete();
    } catch (err) {
        const msg = getFriendlyErrorMessage(err.response?.data?.message || err.message);
        setToast({ open: true, message: msg, severity: 'error' });
    } finally {
        setSubmitting(false);
    }
  };

  return {
    selectedDate, reservations, loadingList, listError,
    openModal, editingReservation, deleteId, submitting, toast, setToast,
    cateringModalOpen, reservationForCatering, cateringConflict,
    handleRedirectToCatering, handleCloseConflict,
    handleChangeDate, handlePrevDay, handleNextDay, handleGoToToday, handleRefresh,
    handleOpenAdd, handleOpenEdit, handleCloseModal, handleOpenDelete, handleCloseDelete, 
    handleSubmit, handleConfirmDelete, handleOpenCatering, handleCloseCatering, handleSubmitCatering    
  };
};