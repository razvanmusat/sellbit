import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { 
    fetchProductStats, 
    setSelectedProduct, 
    setDateRange, 
    selectDashboardStats, 
    selectProductTimeline 
} from '../store/productStatsSlice';
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

export const useProductStats = (warehouseId) => {
    const dispatch = useDispatch();
    const [expanded, setExpanded] = useState(false);

    const { 
        selectedProduct, 
        startDate, 
        endDate, 
        loading, 
        error, 
        loadedWarehouseId 
    } = useSelector((state) => state.productStats);
    
    const dashboardStats = useSelector(selectDashboardStats);
    const rawTimeline = useSelector(selectProductTimeline);

    // FETCH INITIAL SAU LA SCHIMBARE GESTIUNE
    useEffect(() => {
        if (warehouseId && loadedWarehouseId !== warehouseId) {
            dispatch(fetchProductStats({ warehouseId }));
        }
    }, [dispatch, warehouseId, loadedWarehouseId]);

    useEffect(() => {
        if (!warehouseId) {
            return;
        }

        const unsubscribe = onSalesDataChanged(() => {
            dispatch(fetchProductStats({ 
                warehouseId, 
                force: true, 
                overrideDates: { start: startDate, end: endDate }
            }));
        });

        return unsubscribe;
    }, [dispatch, warehouseId, startDate, endDate]);

    // OPTIMIZARE & FIX TOTALURI: 
    // Calculăm stats-urile pe client dacă lipsesc din store sau pentru siguranță 100%
    const productTimeline = useMemo(() => {
        if (!rawTimeline || !rawTimeline.groups) return rawTimeline;

        // Dacă store-ul nu are deja stats calculate, le generăm noi instant din grupuri
        const totalQty = rawTimeline.groups.reduce((acc, group) => acc + (group.groupQty || 0), 0);
        const totalValue = rawTimeline.groups.reduce((acc, group) => acc + (group.groupValue || 0), 0);

        return {
            ...rawTimeline,
            stats: {
                totalQty,
                totalValue
            }
        };
    }, [rawTimeline]);

    const handleSetSelectedProduct = (p) => {
        dispatch(setSelectedProduct(p));
        // Forțăm refresh cu noul produs selectat
        dispatch(fetchProductStats({ warehouseId, force: true }));
    };

    const handleSetStartDate = (d) => {
        if (!d) return;
        const newStart = d.format('YYYY-MM-DDTHH:mm:ss');
        dispatch(setDateRange({ start: newStart, end: endDate }));
        // Pasăm direct valorile noi pentru a evita decalajul de state din Redux
        dispatch(fetchProductStats({ 
            warehouseId, 
            force: true, 
            overrideDates: { start: newStart, end: endDate } 
        }));
    };

    const handleSetEndDate = (d) => {
        if (!d) return;
        const newEnd = d.format('YYYY-MM-DDTHH:mm:ss');
        dispatch(setDateRange({ start: startDate, end: newEnd }));
        dispatch(fetchProductStats({ 
            warehouseId, 
            force: true, 
            overrideDates: { start: startDate, end: newEnd } 
        }));
    };

    const handleChangeAccordion = (panelId) => (event, isExpanded) => {
        setExpanded(isExpanded ? panelId : false);
    };

    return {
        selectedProduct,
        setSelectedProduct: handleSetSelectedProduct,
        startDate: dayjs(startDate),
        setStartDate: handleSetStartDate,
        endDate: dayjs(endDate),
        setEndDate: handleSetEndDate,
        loading,
        error,
        dashboardStats,
        productTimeline,
        expanded,
        handleChangeAccordion
    };
};