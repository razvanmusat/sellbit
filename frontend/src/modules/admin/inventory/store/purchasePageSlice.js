import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { PurchaseService } from '../api/PurchaseService'; 
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

// --- THUNKS ---

// Acțiunea asincronă care aduce raportul
export const fetchPurchaseReport = createAsyncThunk(
    'purchasePage/fetchReport',
    async ({ startDate, endDate, warehouseId }, { rejectWithValue }) => {
        try {
            if (!warehouseId) throw new Error("Gestiunea nu este selectată");
            
            const data = await PurchaseService.getReportByDateRange(startDate, endDate, warehouseId);
            return data || [];
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

// --- SLICE ---

const initialState = {
    // Filtre (stocate ca string YYYY-MM-DD)
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    
    // Date Raport
    reportData: [],
    loading: false,
    error: null,
    
    // Cache Check (să nu reîncărcăm inutil dacă parametrii sunt identici)
    lastFetchedParams: null 
};

const purchasePageSlice = createSlice({
    name: 'purchasePage',
    initialState,
    reducers: {
        setReportDateRange: (state, action) => {
            const { startDate, endDate } = action.payload;
            state.startDate = startDate;
            state.endDate = endDate;
            // Resetăm datele sau le păstrăm, depinde de preferință. 
            // De obicei le păstrăm până se face noul fetch.
        },
        clearReportData: (state) => {
            state.reportData = [];
            state.error = null;
            state.lastFetchedParams = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPurchaseReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPurchaseReport.fulfilled, (state, action) => {
                state.loading = false;
                state.reportData = action.payload;
                // Salvăm parametrii cu care am făcut cererea pentru a evita duplicate (opțional în UI)
                state.lastFetchedParams = action.meta.arg;
            })
            .addCase(fetchPurchaseReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { setReportDateRange, clearReportData } = purchasePageSlice.actions;
export default purchasePageSlice.reducer;