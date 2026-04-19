import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { fetchReservations, setSelectedDate } from '../store/reservationsSlice';
import { ReservationsService } from '../api/ReservationsService';
import { CateringService } from '../../catering/api/CateringService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';
import { invalidateDailyOrders } from '../../catering/store/calendarSlice';

export const useReservationsMainPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    selectedDate: selectedDateStr,
    reservations: dayReservations,
    loading: loadingList,
    error: listError
  } = useSelector((state) => state.reservations);
  const user = useSelector((state) => state.auth?.user);

  const selectedDate = useMemo(() => dayjs(selectedDateStr), [selectedDateStr]);
  const prevDateRef = useRef(selectedDateStr);

  // ← REF care ține mereu valoarea curentă, evită closure stale pe telefon
  const selectedDateStrRef = useRef(selectedDateStr);
  useEffect(() => {
    selectedDateStrRef.current = selectedDateStr;
  }, [selectedDateStr]);

  const [openModal, setOpenModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [cateringModalOpen, setCateringModalOpen] = useState(false);
  const [reservationForCatering, setReservationForCatering] = useState(null);
  const [cateringConflict, setCateringConflict] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [viewMode, setViewMode] = useState('day');
  const [filterOption, setFilterOption] = useState('');
  const [intervalReservations, setIntervalReservations] = useState([]);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalError, setIntervalError] = useState(null);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(dayjs().startOf('month'));
  const [rangeEnd, setRangeEnd] = useState(dayjs().endOf('month'));
  const [activeRange, setActiveRange] = useState(null);
  const [confirmInvitationReservation, setConfirmInvitationReservation] = useState(null);
  const [confirmThemeReservation, setConfirmThemeReservation] = useState(null);

  const isAdmin = user?.authorityLevel === 100;

  const loadData = useCallback((force = false) => {
    if (!selectedDateStr) return;
    if (!force && !listError && !loadingList && dayReservations && dayReservations.length > 0) {
      return;
    }
    dispatch(fetchReservations(selectedDateStr));
  }, [dispatch, selectedDateStr, listError, loadingList, dayReservations]);

  const loadIntervalData = useCallback(async (startDate, endDate, mode) => {
    setIntervalLoading(true);
    setIntervalError(null);
    try {
      const start = dayjs(startDate).startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = dayjs(endDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const data = await ReservationsService.getByInterval(start, end);
      setIntervalReservations(data || []);
      setActiveRange({ start: dayjs(startDate).startOf('day'), end: dayjs(endDate).endOf('day') });
      setViewMode(mode);
    } catch (error) {
      setIntervalReservations([]);
      setIntervalError(error.response?.data?.message || error.message || 'Nu s-au putut încărca rezervările.');
    } finally {
      setIntervalLoading(false);
    }
  }, []);

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
    setViewMode('day');
    setFilterOption('');
    const dateStr = newDate ? newDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    setSearchParams({ date: dateStr });
  };

  const handlePrevDay = () => handleChangeDate(selectedDate.subtract(1, 'day'));
  const handleNextDay = () => handleChangeDate(selectedDate.add(1, 'day'));

  const handleGoToToday = () => {
    setViewMode('day');
    setFilterOption('');
    const todayStr = dayjs().format('YYYY-MM-DD');
    setSearchParams({ date: todayStr });
    if (selectedDateStrRef.current === todayStr) {
      dispatch(fetchReservations(todayStr));
    }
  };

  const handleRefresh = () => {
    if (viewMode === 'day') {
      dispatch(fetchReservations(selectedDateStrRef.current));
      return;
    }
    if (activeRange) {
      loadIntervalData(activeRange.start, activeRange.end, viewMode);
    }
  };

  const handleFilterOptionChange = (option) => {
    setFilterOption(option);
    if (option === 'currentMonth') {
      loadIntervalData(dayjs().startOf('month'), dayjs().endOf('month'), 'currentMonth');
      return;
    }
    if (option === 'customInterval') {
      if (activeRange && viewMode === 'customInterval') {
        setRangeStart(dayjs(activeRange.start));
        setRangeEnd(dayjs(activeRange.end));
      } else {
        setRangeStart(dayjs().startOf('month'));
        setRangeEnd(dayjs().endOf('month'));
      }
      setRangeModalOpen(true);
    }
  };

  const handleCloseRangeModal = () => {
    setRangeModalOpen(false);
    if (viewMode === 'day') setFilterOption('');
    if (viewMode === 'currentMonth') setFilterOption('currentMonth');
    if (viewMode === 'customInterval') setFilterOption('customInterval');
  };

  const handleApplyCustomRange = async () => {
    if (!rangeStart || !rangeEnd) {
      setToast({ open: true, message: 'Te rog selectează ambele date.', severity: 'warning' });
      return;
    }
    if (dayjs(rangeStart).isAfter(dayjs(rangeEnd), 'day')) {
      setToast({ open: true, message: 'Data de început trebuie să fie înainte de data de sfârșit.', severity: 'warning' });
      return;
    }
    await loadIntervalData(rangeStart, rangeEnd, 'customInterval');
    setRangeModalOpen(false);
    setFilterOption('customInterval');
  };

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

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingReservation(null);
  };

  const handleOpenDelete = (reservation) => {
    if (dayjs(reservation.startAt).isBefore(dayjs().startOf('day'))) {
      setToast({ open: true, message: 'Nu poți șterge o rezervare din trecut!', severity: 'warning' });
      return;
    }
    setDeleteId(reservation.id);
  };

  const handleCloseDelete = () => setDeleteId(null);

  const handleOpenConfirmInvitation = (reservation) => {
    if (!isAdmin) return;
    if (reservation?.digitalInvitation !== null) return;
    setConfirmInvitationReservation(reservation);
  };

  const handleCloseConfirmInvitation = () => {
    setConfirmInvitationReservation(null);
  };

  const handleConfirmInvitation = async () => {
    if (!confirmInvitationReservation?.id) return;
    setSubmitting(true);
    try {
      await ReservationsService.confirmDigitalInvitation(confirmInvitationReservation.id);
      setToast({ open: true, message: 'Invitația digitală a fost confirmată.', severity: 'success' });
      setConfirmInvitationReservation(null);
      if (viewMode === 'day') {
        dispatch(fetchReservations(selectedDateStrRef.current));
      } else if (activeRange) {
        await loadIntervalData(activeRange.start, activeRange.end, viewMode);
      }
    } catch (err) {
      const msg = getFriendlyErrorMessage(err.response?.data?.message || err.message);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenConfirmTheme = (reservation) => {
    if (!isAdmin) return;
    if (!reservation?.theme || reservation?.themeConfirmed === true) return;
    setConfirmThemeReservation(reservation);
  };

  const handleCloseConfirmTheme = () => {
    setConfirmThemeReservation(null);
  };

  const handleConfirmTheme = async () => {
    if (!confirmThemeReservation?.id) return;
    setSubmitting(true);
    try {
      await ReservationsService.confirmTheme(confirmThemeReservation.id);
      setToast({ open: true, message: 'Tematica a fost confirmată.', severity: 'success' });
      setConfirmThemeReservation(null);
      if (viewMode === 'day') {
        dispatch(fetchReservations(selectedDateStrRef.current));
      } else if (activeRange) {
        await loadIntervalData(activeRange.start, activeRange.end, viewMode);
      }
    } catch (err) {
      const msg = getFriendlyErrorMessage(err.response?.data?.message || err.message);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

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
        dispatch(invalidateDailyOrders());

        const oldDate = dayjs(editingReservation.startAt).format('YYYY-MM-DD');
        const newDate = dayjs(data.startAt).format('YYYY-MM-DD');

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
        dispatch(fetchReservations(selectedDateStrRef.current)); // ← ref, nu closure
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
      dispatch(fetchReservations(selectedDateStrRef.current)); // ← ref, nu closure
      dispatch(invalidateDailyOrders());
      handleCloseDelete();
    } catch (err) {
      const msg = getFriendlyErrorMessage(err.response?.data?.message || err.message);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const reservations = viewMode === 'day' ? dayReservations : intervalReservations;
  const isLoading = viewMode === 'day' ? loadingList : intervalLoading;
  const errorToShow = viewMode === 'day' ? listError : intervalError;

  const emptyStateLabel = viewMode === 'day'
    ? selectedDate?.format('DD/MM/YYYY')
    : activeRange
      ? `${dayjs(activeRange.start).format('DD/MM/YYYY')} - ${dayjs(activeRange.end).format('DD/MM/YYYY')}`
      : selectedDate?.format('DD/MM/YYYY');

  const selectedIntervalLabel = activeRange
    ? `${dayjs(activeRange.start).format('DD/MM/YYYY')} - ${dayjs(activeRange.end).format('DD/MM/YYYY')}`
    : 'Selectează interval';

  const groupedReservationsByDay = useMemo(() => {
    if (viewMode === 'day') return [];

    const groups = intervalReservations.reduce((acc, reservation) => {
      const dateKey = dayjs(reservation.startAt).format('YYYY-MM-DD');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(reservation);
      return acc;
    }, {});

    return Object.keys(groups)
      .sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf())
      .map((dateKey) => ({
        dateKey,
        title: dayjs(dateKey).locale('ro').format('dddd D MMMM'),
        reservations: groups[dateKey]
      }));
  }, [viewMode, intervalReservations]);

  return {
    selectedDate, reservations, loadingList: isLoading, listError: errorToShow,
    openModal, editingReservation, deleteId, submitting, toast, setToast,
    cateringModalOpen, reservationForCatering, cateringConflict,
    handleRedirectToCatering, handleCloseConflict,
    handleChangeDate, handlePrevDay, handleNextDay, handleGoToToday, handleRefresh,
    filterOption, handleFilterOptionChange,
    rangeModalOpen, rangeStart, rangeEnd, setRangeStart, setRangeEnd,
    handleCloseRangeModal, handleApplyCustomRange,
    emptyStateLabel,
    selectedIntervalLabel,
    viewMode,
    groupedReservationsByDay,
    isAdmin,
    confirmInvitationReservation,
    handleOpenConfirmInvitation,
    handleCloseConfirmInvitation,
    handleConfirmInvitation,
    confirmThemeReservation,
    handleOpenConfirmTheme,
    handleCloseConfirmTheme,
    handleConfirmTheme,
    handleOpenAdd, handleOpenEdit, handleCloseModal, handleOpenDelete, handleCloseDelete,
    handleSubmit, handleConfirmDelete, handleOpenCatering, handleCloseCatering, handleSubmitCatering
  };
};