import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { StockAdjustmentService } from '../api/StockAdjustmentService'; // Asigură-te de cale
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

// --- THUNKS ---

export const fetchAdjustmentReport = createAsyncThunk(
    'adjustmentPage/fetchReport',
    async ({ startDate, endDate, warehouseId }, { rejectWithValue }) => {
        try {
            if (!warehouseId) throw new Error("Gestiunea nu este selectată");
            
            // Apelăm endpoint-ul nou creat care suportă warehouseId
            const data = await StockAdjustmentService.getReportByDateRange(startDate, endDate, warehouseId);
            return data || [];
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

// --- SLICE ---

const initialState = {
    // Filtre (string YYYY-MM-DD)
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    
    // Date
    reportData: [],
    loading: false,
    error: null,
    
    lastFetchedParams: null 
};

const adjustmentPageSlice = createSlice({
    name: 'adjustmentPage',
    initialState,
    reducers: {
        setAdjustmentDateRange: (state, action) => {
            const { startDate, endDate } = action.payload;
            state.startDate = startDate;
            state.endDate = endDate;
        },
        clearAdjustmentData: (state) => {
            state.reportData = [];
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdjustmentReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAdjustmentReport.fulfilled, (state, action) => {
                state.loading = false;
                state.reportData = action.payload;
                state.lastFetchedParams = action.meta.arg;
            })
            .addCase(fetchAdjustmentReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { setAdjustmentDateRange, clearAdjustmentData } = adjustmentPageSlice.actions;
export default adjustmentPageSlice.reducer;