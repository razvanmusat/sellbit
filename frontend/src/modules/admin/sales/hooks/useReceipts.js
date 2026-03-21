import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { fetchReceipts, setFilters, selectGroupedReceipts } from '../store/receiptsSlice';
import { SalesService } from '../api/SalesService';
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

export const useReceipts = (warehouseId = null) => {
    const dispatch = useDispatch();
    const { startDate, endDate, status, loading, list, loadedWarehouseId } = useSelector(state => state.receipts);
    const groupedReceipts = useSelector(selectGroupedReceipts);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const cacheKey = warehouseId ?? 'ALL';

    useEffect(() => {
        if (status && loadedWarehouseId !== cacheKey) {
            dispatch(fetchReceipts({ warehouseId, summary: true }));
        }
    }, [warehouseId, status, loadedWarehouseId, dispatch]);

    useEffect(() => {
        if (!status) return;
        const unsubscribe = onSalesDataChanged(() => {
            dispatch(fetchReceipts({ warehouseId, force: true, summary: true }));
        });
        return unsubscribe;
    }, [dispatch, warehouseId, status]);

    const setDate = (type, val) => {
        const fmt = type === 'start'
            ? val.startOf('day').format('YYYY-MM-DDTHH:mm:ss')
            : val.endOf('day').format('YYYY-MM-DDTHH:mm:ss');
        dispatch(setFilters({ [type === 'start' ? 'startDate' : 'endDate']: fmt }));
        dispatch(fetchReceipts({ warehouseId, force: true, summary: true }));
    };

    const setStatus = (s) => {
        dispatch(setFilters({ status: s }));
        dispatch(fetchReceipts({ warehouseId, force: true, summary: true }));
    };

    const openReceipt = async (id) => {
        const local = list.find(r => r.id === id);
        if (local?.items && local?.payments) { setSelectedReceipt(local); setModalOpen(true); return; }
        const data = await SalesService.getReceiptById(id);
        if (data) { setSelectedReceipt(data); setModalOpen(true); }
    };

    return {
        startDate: dayjs(startDate), endDate: dayjs(endDate), status, groupedReceipts, loading,
        setDate, setStatus, selectedReceipt, setSelectedReceipt, modalOpen, setModalOpen, openReceipt,
        refreshData: () => dispatch(fetchReceipts({ warehouseId, force: true, summary: true }))
    };
};