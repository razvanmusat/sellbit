import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { StockAdjustmentService } from '../api/StockAdjustmentService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

dayjs.extend(quarterOfYear);

export const useAdjustmentProductAudit = (warehouseId) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- STATE FILTRE ---
    const [selectedYear, setSelectedYear] = useState(dayjs().year());
    const [viewMode, setViewMode] = useState(''); 

    // --- FETCH DATA ---
    useEffect(() => {
        if (!selectedProduct?.id) {
            setHistoryData([]);
            return;
        }

        const fetchAudit = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Luăm tot istoricul produsului
                const data = await StockAdjustmentService.getByProduct(selectedProduct.id);
                
                // 2. FILTRARE: Păstrăm doar ce ține de GESTIUNEA CURENTĂ
                const currentWarehouseData = (data || []).filter(item => item.warehouseId === warehouseId);

                // 3. Sortăm descrescător după dată
                const sortedData = currentWarehouseData.sort((a, b) => dayjs(b.adjustedAt).diff(dayjs(a.adjustedAt)));
                
                setHistoryData(sortedData);
            } catch (err) {
                setError(getFriendlyErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchAudit();
    }, [selectedProduct, warehouseId]); 

    // --- RESET DOAR LA NEVOIE ---
    // AM MODIFICAT AICI: Nu mai resetăm produsul, anul sau viewMode-ul când schimbi gestiunea.
    useEffect(() => {
        // Lăsăm gol sau ștergem complet logica de resetare dacă vrem persistență totală.
        // Istoricul se actualizează oricum din useEffect-ul de mai sus care depinde de [warehouseId].
        
        // Singurul lucru pe care e bine să-l facem e să golim istoricul MOMENTAN până vine noul fetch, 
        // ca să nu vezi datele vechi o fracțiune de secundă.
        setHistoryData([]); 
        
    }, [warehouseId]);

    // --- PROCESARE DATE (Grupare & Statistici) ---
    const processed = useMemo(() => {
        if (!historyData || historyData.length === 0 || viewMode === '') {
            return { groups: [], stats: { totalAdjusted: 0, opsCount: 0 } };
        }

        const filteredByYear = historyData.filter(item => dayjs(item.adjustedAt).year() === selectedYear);
        
        let totalAdjusted = 0;
        
        filteredByYear.forEach(item => {
            totalAdjusted += Number(item.quantityChange);
        });

        const groups = {};
        filteredByYear.forEach(item => {
            const date = dayjs(item.adjustedAt);
            let key = '', label = '', sortOrder = 0;

            if (viewMode === 'YEARLY') {
                key = 'FULL_YEAR'; label = `Anul ${selectedYear}`; sortOrder = 1;
            } else if (viewMode === 'SEMESTER') {
                const month = date.month(); 
                const sem = month < 6 ? 1 : 2;
                key = `SEM_${sem}`; label = `Semestrul ${sem}`; sortOrder = sem;
            } else if (viewMode === 'QUARTER') {
                const q = date.quarter();
                key = `Q_${q}`; label = `Trimestrul ${q}`; sortOrder = q;
            } else if (viewMode === 'MONTH') {
                key = date.format('MM'); label = date.format('MMMM').toUpperCase(); sortOrder = date.month();
            }

            if (!groups[key]) groups[key] = { id: key, label, items: [], totalQty: 0, sortKey: sortOrder };
            groups[key].items.push(item);
            groups[key].totalQty += Number(item.quantityChange);
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);
        
        return { 
            groups: sortedGroups, 
            stats: { 
                totalAdjusted, 
                opsCount: filteredByYear.length
            } 
        };

    }, [historyData, selectedYear, viewMode]);

    // --- LISTA ANI DISPONIBILI ---
    const availableYears = useMemo(() => {
        if (!historyData || historyData.length === 0) return [dayjs().year()];
        const years = historyData.map(item => dayjs(item.adjustedAt).year());
        return [...new Set(years)].sort((a, b) => b - a);
    }, [historyData]);

    return {
        selectedProduct, setSelectedProduct,
        loading, 
        error,
        selectedYear, setSelectedYear,
        viewMode, setViewMode,
        processed,
        availableYears
    };
};