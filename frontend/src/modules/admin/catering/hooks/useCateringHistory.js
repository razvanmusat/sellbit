import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { selectGroupedHistoryOrders, fetchHistoryRange } from '../store/cateringSlice';

export const useCateringHistory = () => {
    const dispatch = useDispatch();
    const { groups, grandTotal } = useSelector(selectGroupedHistoryOrders);
    const { loading, historyLoading } = useSelector((state) => state.catering);
    const [searchParams, setSearchParams] = useSearchParams();
    
    // 2. STATE LOCAL - Init din URL
    const [startDate, setStartDate] = useState(() => {
        const paramDate = searchParams.get('startDate');
        return paramDate ? dayjs(paramDate) : dayjs().startOf('year');
    });

    const [endDate, setEndDate] = useState(() => {
        const paramDate = searchParams.get('endDate');
        return paramDate ? dayjs(paramDate) : dayjs().endOf('day');
    });

    // Sync URL
    useEffect(() => {
        const currentParams = Object.fromEntries(searchParams);
        if (currentParams.startDate !== startDate.format('YYYY-MM-DD') || 
            currentParams.endDate !== endDate.format('YYYY-MM-DD')) {
            
            setSearchParams({
                ...currentParams,
                startDate: startDate.format('YYYY-MM-DD'),
                endDate: endDate.format('YYYY-MM-DD')
            }, { replace: true });
        }
    }, [startDate, endDate, setSearchParams, searchParams]);

    // 3. FETCH LA SCHIMBAREA DATEI
    useEffect(() => {
        // Fetch-ul se face indiferent dacă e din URL sau default
        const startStr = startDate.format('YYYY-MM-DD');
        const endStr = endDate.format('YYYY-MM-DD');
        dispatch(fetchHistoryRange({ start: startStr, end: endStr }));
    }, [startDate, endDate, dispatch]);

    const isLoading = loading || historyLoading;

    return {
        startDate, setStartDate,
        endDate, setEndDate,
        groups,
        grandTotal,
        isLoading
    };
};