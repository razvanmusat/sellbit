import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SalesService } from '../api/SalesService';

export const fetchPaymentsReport = createAsyncThunk(
    'payments/fetchReport',
    async ({ warehouseId, start, end, methodCode }) => {
        // Trimitem formatul ISO cerut de Spring: YYYY-MM-DDTHH:mm:ss
        const response = await SalesService.getPaymentsReport({
            warehouseId,
            start: start.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
            end: end.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
            methodCode: methodCode || null
        });
        return response; 
    }
);

const paymentsSlice = createSlice({
    name: 'payments',
    initialState: {
        data: [],
        loading: false,
        error: null,
    },
    reducers: {
        resetPayments: (state) => {
            state.data = [];
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPaymentsReport.pending, (state) => { 
                state.loading = true; 
                state.error = null;
            })
            .addCase(fetchPaymentsReport.fulfilled, (state, action) => {
                state.loading = false;
                // Verificăm dacă payload este array (Spring poate returna direct lista)
                state.data = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchPaymentsReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Eroare la încărcarea încasărilor";
            });
    }
});

export const { resetPayments } = paymentsSlice.actions;
export default paymentsSlice.reducer;