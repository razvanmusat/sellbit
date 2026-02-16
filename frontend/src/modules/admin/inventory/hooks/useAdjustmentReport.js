import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { 
    setAdjustmentDateRange, 
    fetchAdjustmentReport 
} from '../store/adjustmentPageSlice';
import { AdjustmentReasonService } from '../api/AdjustmentReasonService';

export const useAdjustmentReport = (warehouseId) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const dispatch = useDispatch();

    const { 
        startDate, 
        endDate, 
        reportData: rawData, 
        loading, 
        error 
    } = useSelector((state) => state.adjustmentPage);

    const [reasons, setReasons] = useState([]);
    const [filterReason, setFilterReason] = useState('ALL');

    useEffect(() => {
        let isMounted = true;
        AdjustmentReasonService.getActiveReasons()
            .then(data => { if (isMounted) setReasons(data || []); })
            .catch(console.error);
        return () => { isMounted = false; };
    }, []);

    const startDateObj = useMemo(() => dayjs(startDate), [startDate]);
    const endDateObj = useMemo(() => dayjs(endDate), [endDate]);

    const setStartDate = (newDate) => {
        if (newDate) {
            dispatch(setAdjustmentDateRange({ 
                startDate: newDate.format('YYYY-MM-DD'), 
                endDate 
            }));
        }
    };

    const setEndDate = (newDate) => {
        if (newDate) {
            dispatch(setAdjustmentDateRange({ 
                startDate, 
                endDate: newDate.format('YYYY-MM-DD') 
            }));
        }
    };

    const fetchReport = () => {
        if (warehouseId) {
            dispatch(fetchAdjustmentReport({ 
                startDate, 
                endDate, 
                warehouseId 
            }));
        }
    };

    // 1. GRUPARE NIVEL 1: Operațiuni (Time + User + Reason)
    // Aceasta este logica veche, pe care o păstrăm ca pas intermediar
    const operationGroups = useMemo(() => {
        const groups = {};
        
        const filteredData = filterReason === 'ALL' 
            ? rawData 
            : rawData.filter(item => item.reasonLabel === filterReason);
        
        filteredData.forEach(item => {
            const timeKey = dayjs(item.adjustedAt).format('YYYY-MM-DD HH:mm');
            const groupKey = `${timeKey}_${item.userName}_${item.reasonLabel}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = { 
                    id: groupKey, 
                    adjustedAt: item.adjustedAt, 
                    reasonLabel: item.reasonLabel, 
                    userName: item.userName, 
                    items: [] // Items rămân produsele individuale
                };
            }
            groups[groupKey].items.push(item);
        });

        // Le sortăm descrescător ca să avem operațiunile în ordine
        return Object.values(groups).sort((a, b) => dayjs(b.adjustedAt).diff(dayjs(a.adjustedAt)));
    }, [rawData, filterReason]);

    // 2. GRUPARE NIVEL 2: Zile (Aceasta este logica NOUĂ)
    const dailyGroups = useMemo(() => {
        const days = {};

        operationGroups.forEach(op => {
            // Cheie unică pe zi: YYYY-MM-DD
            const dayKey = dayjs(op.adjustedAt).format('YYYY-MM-DD');
            
            if (!days[dayKey]) {
                days[dayKey] = {
                    date: dayKey,
                    // Formatăm frumos label-ul (ex: "Luni, 15 Februarie 2026")
                    label: dayjs(op.adjustedAt).locale('ro').format('dddd, D MMMM YYYY'),
                    operations: [] // Aici punem acordeoanele (grupurile de operațiuni)
                };
            }
            days[dayKey].operations.push(op);
        });

        // Returnăm zilele sortate descrescător (cea mai recentă zi sus)
        return Object.values(days).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
    }, [operationGroups]);

    return {
        isMobile,
        startDate: startDateObj, 
        setStartDate,
        endDate: endDateObj,    
        setEndDate,
        rawData,
        loading,
        error,
        // Trimitem structura pe Zile, nu pe Operațiuni
        dailyGroups, 
        fetchReport,
        reasons,
        filterReason,
        setFilterReason
    };
};