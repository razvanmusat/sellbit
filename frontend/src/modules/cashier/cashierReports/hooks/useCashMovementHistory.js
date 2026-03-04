import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashMovementHistory } from '../store/cashMovementHistorySlice';
import { CashMovementService } from '../api/CashMovementService';

export const useCashMovementHistory = (warehouseId, initialFilters = {}) => {
    const dispatch = useDispatch();
    const { cache, loading, error } = useSelector(state => state.cashMovementHistory);
    const [movementTypes, setMovementTypes] = useState([]);
    const [selectedType, setSelectedType] = useState(initialFilters.selectedType ?? '');
    const [startDate, setStartDate] = useState(initialFilters.startDate ?? dayjs());
    const [endDate, setEndDate] = useState(initialFilters.endDate ?? dayjs());

    // Fetch tipuri de mișcare (O SINGURĂ DATĂ la montare, nu pe warehouseId)
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const typesData = await CashMovementService.getActiveTypes();
                const cashOnlyTypes = (typesData || []).filter(t => t.code !== 'REFUND_CARD');
                setMovementTypes(cashOnlyTypes);
            } catch (err) {
                setMovementTypes([]);
            }
        };
        fetchTypes();
    }, []);

    // Fetch istoric din Redux slice
    useEffect(() => {
        if (!warehouseId || !startDate || !endDate || !selectedType) return;
        dispatch(fetchCashMovementHistory({
            warehouseId,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            type: selectedType
        }));
    }, [warehouseId, startDate, endDate, selectedType]);

    // Reset filters la schimbare warehouseId: păstrează ultima selecție validă
    useEffect(() => {
        if (initialFilters.startDate) setStartDate(initialFilters.startDate);
        if (initialFilters.endDate) setEndDate(initialFilters.endDate);
        // Nu reseta selectedType, lasă-l pe ultima selecție a utilizatorului
    }, [warehouseId]);

    // Dacă selectedType nu există în movementTypes, nu reseta automat, doar lasă-l selectat (userul decide manual)
    // Astfel, dacă userul alege "Depunere banca" și schimbă gestiunea, selecția rămâne vizibilă și fetch-ul se face instant pentru noua gestiune

    // Derived filteredMovements din cache Redux
    const cacheKey = warehouseId && startDate && endDate && selectedType
        ? `${warehouseId}_${startDate.format('YYYY-MM-DD')}_${endDate.format('YYYY-MM-DD')}_${selectedType}`
        : null;
    const movements = cacheKey && cache[cacheKey] ? cache[cacheKey] : [];
    const filteredMovements = useMemo(() => {
        const sortedMovements = [...movements].sort(
            (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
        );
        if (!selectedType || selectedType === 'ALL') {
            return sortedMovements;
        }
        return sortedMovements.filter(m => m.typeCode === selectedType);
    }, [movements, selectedType]);

    return {
        movementTypes,
        filteredMovements,
        loading,
        error,
        selectedType,
        setSelectedType,
        startDate,
        setStartDate,
        endDate,
        setEndDate
    };
};