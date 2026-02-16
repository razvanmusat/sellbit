import { useEffect, useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { 
    setReportDateRange, 
    fetchPurchaseReport 
} from '../store/purchasePageSlice';

export const usePurchaseReport = (warehouseId) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const dispatch = useDispatch();

    // 1. CITIM STATE-UL DIN REDUX
    const { 
        startDate, 
        endDate, 
        reportData: rawData, 
        loading, 
        error 
    } = useSelector((state) => state.purchasePage);

    // 2. CONVERTIBILITATE PENTRU UI
    const startDateObj = useMemo(() => dayjs(startDate), [startDate]);
    const endDateObj = useMemo(() => dayjs(endDate), [endDate]);

    // 3. SETTERS
    const setStartDate = (newDate) => {
        if (newDate) {
            dispatch(setReportDateRange({ 
                startDate: newDate.format('YYYY-MM-DD'), 
                endDate 
            }));
        }
    };

    const setEndDate = (newDate) => {
        if (newDate) {
            dispatch(setReportDateRange({ 
                startDate, 
                endDate: newDate.format('YYYY-MM-DD') 
            }));
        }
    };

    // 4. FETCH
    const fetchReport = () => {
        if (warehouseId) {
            dispatch(fetchPurchaseReport({ 
                startDate, 
                endDate, 
                warehouseId 
            }));
        }
    };

    // --- LOGICA DE GRUPARE NOUĂ ---

    // Pasul 1: Grupăm liniile în Facturi/Operațiuni (Logica veche)
    const purchaseGroups = useMemo(() => {
        const groups = {};
        rawData.forEach(item => {
            const timeKey = dayjs(item.purchasedAt).format('YYYY-MM-DD HH:mm:ss');
            const groupKey = `${timeKey}_${item.note || 'FN'}`; // Cheie unică per achiziție
            if (!groups[groupKey]) {
                groups[groupKey] = { 
                    id: groupKey, 
                    purchasedAt: item.purchasedAt, 
                    note: item.note, 
                    userName: item.userName, 
                    items: [], 
                    totalValue: 0 
                };
            }
            groups[groupKey].items.push(item);
            groups[groupKey].totalValue += (Number(item.quantity) * Number(item.purchasePrice));
        });
        // Sortare descrescătoare a achizițiilor
        return Object.values(groups).sort((a, b) => dayjs(b.purchasedAt).diff(dayjs(a.purchasedAt)));
    }, [rawData]);

    // Pasul 2: Grupăm Facturile în Zile (Logica nouă)
    const dailyGroups = useMemo(() => {
        const days = {};

        purchaseGroups.forEach(purchase => {
            const dayKey = dayjs(purchase.purchasedAt).format('YYYY-MM-DD');
            
            if (!days[dayKey]) {
                days[dayKey] = {
                    date: dayKey,
                    label: dayjs(purchase.purchasedAt).locale('ro').format('dddd, D MMMM YYYY'), // Ex: Luni, 15 Februarie 2026
                    purchases: [] // Lista de acordeoane
                };
            }
            days[dayKey].purchases.push(purchase);
        });

        // Sortăm zilele descrescător (cea mai recentă zi sus)
        return Object.values(days).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
    }, [purchaseGroups]);

    return {
        isMobile,
        startDate: startDateObj, 
        setStartDate,
        endDate: endDateObj,    
        setEndDate,
        rawData,
        loading,
        error,
        dailyGroups, // Returnăm structura pe Zile
        fetchReport
    };
};