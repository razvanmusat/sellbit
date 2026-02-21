import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { SalesService } from '../api/SalesService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const fetchReceipts = createAsyncThunk(
    'receipts/fetch',
    async ({ warehouseId, force = false, summary = false }, { getState, rejectWithValue }) => {
        const { startDate, endDate, status, loadedWarehouseId, list } = getState().receipts;
        
        // STOP dacă datele sunt deja aici (evită flash-ul de loading)
        if (!force && loadedWarehouseId === warehouseId && list.length > 0) {
            return { data: list, warehouseId, cached: true };
        }

        if (!warehouseId || !status) return rejectWithValue("Lipsă parametri");

        try {
            const apiStatus = status === 'REFUNDED' ? 'CLOSED' : status;
            const data = summary
                ? await SalesService.getReceiptsSummary({
                    start: startDate, end: endDate, warehouseId, status: apiStatus
                })
                : await SalesService.getReceiptsHistory({
                    start: startDate, end: endDate, warehouseId, status: apiStatus
                });
            return { data: data || [], warehouseId, cached: false }; 
        } catch (err) {
            return rejectWithValue(getFriendlyErrorMessage(err));
        }
    }
);

const initialState = {
    startDate: dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
    endDate: dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
    status: 'CLOSED', 
    list: [],
    loadedWarehouseId: null, 
    loading: false,
    error: null
};

const receiptsSlice = createSlice({
    name: 'receipts',
    initialState,
    reducers: {
        setFilters: (state, action) => {
            Object.assign(state, action.payload);
            state.loadedWarehouseId = null; // Invalidează pentru a forța fetch pe noile filtre
        },
        resetReceipts: () => initialState
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchReceipts.pending, (state, action) => {
                // Nu arătăm loading dacă avem deja date cache-uite (evită flicker)
                if (!action.meta.arg.force && state.loadedWarehouseId === action.meta.arg.warehouseId) return;
                state.loading = true;
            })
            .addCase(fetchReceipts.fulfilled, (state, action) => {
                state.loading = false;
                if (!action.payload.cached) {
                    state.list = action.payload.data;
                    state.loadedWarehouseId = action.payload.warehouseId;
                }
            })
            .addCase(fetchReceipts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

// SELECTOR DE VITEZĂ: Grupare instantanee
export const selectGroupedReceipts = createSelector(
    [state => state.receipts.list, state => state.receipts.status],
    (list, statusFilter) => {
        if (!list.length) return [];
        const groups = {};
        for (const r of list) {
            if (statusFilter === 'REFUNDED' && !r.originalReceiptId) continue;
            if (statusFilter === 'CLOSED' && r.originalReceiptId) continue;
            const dateKey = (r.closedAt || r.createdAt).substring(0, 10);
            if (!groups[dateKey]) groups[dateKey] = { date: dateKey, total: 0, count: 0, items: [] };
            groups[dateKey].items.push(r);
            groups[dateKey].total += (r.totalAmount || 0);
            groups[dateKey].count++;
        }
        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }
);

export const { setFilters, resetReceipts } = receiptsSlice.actions;
export default receiptsSlice.reducer;