import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { StockAdjustmentService } from '../api/StockAdjustmentService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useAdjustmentProductAudit = (warehouseId) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [allHistoryData, setAllHistoryData] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- STATE DATE ---
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());

    // --- FETCH DATA ---
    useEffect(() => {
        if (!selectedProduct?.id) {
            setAllHistoryData([]);
            return;
        }

        const fetchAudit = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await StockAdjustmentService.getByProduct(selectedProduct.id);
                // Filtrare strictă pe gestiune
                const currentWarehouseData = (data || []).filter(item => item.warehouseId === warehouseId);
                // Sortare descrescătoare
                const sortedData = currentWarehouseData.sort((a, b) => dayjs(b.adjustedAt).diff(dayjs(a.adjustedAt)));
                
                setAllHistoryData(sortedData);
            } catch (err) {
                setError(getFriendlyErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchAudit();
    }, [selectedProduct, warehouseId]); 

    // --- PROCESARE (Filtrare + Grupare) ---
    const processed = useMemo(() => {
        // Dacă lipsesc datele sau datele de calendar sunt invalide (null), returnăm gol
        if (!allHistoryData || allHistoryData.length === 0 || !startDate || !endDate) {
            return { groups: [], stats: { totalAdjusted: 0, opsCount: 0 } };
        }

        // 1. FILTRARE: Normalizăm orele pentru a include toată ziua
        // start -> 00:00:00, end -> 23:59:59
        const startNorm = startDate.startOf('day');
        const endNorm = endDate.endOf('day');

        const filteredData = allHistoryData.filter(item => {
            const itemDate = dayjs(item.adjustedAt);
            return (itemDate.isSame(startNorm) || itemDate.isAfter(startNorm)) && 
                   (itemDate.isSame(endNorm) || itemDate.isBefore(endNorm));
        });

        let totalAdjusted = 0;
        filteredData.forEach(item => {
            totalAdjusted += Number(item.quantityChange);
        });

        // 2. GRUPARE pe Luni
        const groups = {};
        filteredData.forEach(item => {
            const date = dayjs(item.adjustedAt);
            const key = date.format('MM-YYYY'); 
            const monthName = date.format('MMMM').toUpperCase();
            const label = `${monthName} ${date.format('YYYY')}`;
            const sortOrder = date.valueOf();

            if (!groups[key]) {
                groups[key] = { id: key, label, items: [], totalQty: 0, sortKey: sortOrder };
            }
            
            groups[key].items.push(item);
            groups[key].totalQty += Number(item.quantityChange);
        });

        // Sortăm grupurile (cele mai noi sus)
        const sortedGroups = Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);
        
        return { 
            groups: sortedGroups, 
            stats: { totalAdjusted, opsCount: filteredData.length } 
        };

    }, [allHistoryData, startDate, endDate]);

    return {
        selectedProduct, setSelectedProduct,
        startDate, setStartDate,
        endDate, setEndDate,
        loading, error, processed
    };
};