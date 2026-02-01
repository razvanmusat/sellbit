import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { CashMovementService } from '../api/CashMovementService';

export const useCashMovementHistory = (warehouseId) => {
    // --- STATE ---
    const [movementTypes, setMovementTypes] = useState([]); 
    const [movements, setMovements] = useState([]);
    
    // Filtre
    const [selectedType, setSelectedType] = useState(''); 
    const [startDate, setStartDate] = useState(dayjs());  
    const [endDate, setEndDate] = useState(dayjs());      

    // Status
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- 1. Încărcare Tipuri (O singură dată) ---
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const typesData = await CashMovementService.getActiveTypes();
                // Filtrăm REFUND_CARD
                const cashOnlyTypes = (typesData || []).filter(t => t.code !== 'REFUND_CARD');
                setMovementTypes(cashOnlyTypes);
            } catch (err) {
                console.error("Eroare tipuri:", err);
            }
        };
        fetchTypes();
    }, []);

    // --- 2. Încărcare Istoric ---
    useEffect(() => {
        const fetchHistory = async () => {
            if (!warehouseId) return;

            setLoading(true);
            setError('');
            try {
                const from = startDate.format('YYYY-MM-DD');
                const to = endDate.format('YYYY-MM-DD');
                
                const data = await CashMovementService.getHistory(warehouseId, from, to);
                setMovements(data || []);
            } catch (err) {
                setError('Nu s-a putut încărca istoricul.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [warehouseId, startDate, endDate]);

    // --- 3. Filtrare Locală (Derived State) ---
    const filteredMovements = useMemo(() => {
        if (!selectedType) return [];
        return movements.filter(m => m.typeCode === selectedType);
    }, [movements, selectedType]);

    // Returnăm doar ce are nevoie UI-ul
    return {
        // Date
        movementTypes,
        filteredMovements,
        loading,
        error,
        
        // Controale (Setters)
        selectedType,
        setSelectedType,
        startDate,
        setStartDate,
        endDate,
        setEndDate
    };
};