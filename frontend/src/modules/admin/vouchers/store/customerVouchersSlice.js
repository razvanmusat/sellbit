import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CustomerVoucherService } from '../api/CustomerVoucherService';

export const fetchAvailableVouchers = createAsyncThunk(
  'customerVouchers/fetchAvailable',
  async ({ fromDate, toDate }, { rejectWithValue }) => {
    try {
      const data = await CustomerVoucherService.getAvailable(fromDate, toDate);
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la încărcarea voucherelor disponibile');
    }
  }
);

export const fetchUsedVouchers = createAsyncThunk(
  'customerVouchers/fetchUsed',
  async ({ fromDate, toDate }, { rejectWithValue }) => {
    try {
      const data = await CustomerVoucherService.getUsed(fromDate, toDate);
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la încărcarea voucherelor folosite');
    }
  }
);

const initialState = {
  available: [],
  used: [],
  loadingAvailable: false,
  loadingUsed: false,
  errorAvailable: null,
  errorUsed: null,
};

const customerVouchersSlice = createSlice({
  name: 'customerVouchers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableVouchers.pending, (state) => {
        state.loadingAvailable = true;
        state.errorAvailable = null;
      })
      .addCase(fetchAvailableVouchers.fulfilled, (state, action) => {
        state.loadingAvailable = false;
        state.available = action.payload;
      })
      .addCase(fetchAvailableVouchers.rejected, (state, action) => {
        state.loadingAvailable = false;
        state.errorAvailable = action.payload;
      })
      .addCase(fetchUsedVouchers.pending, (state) => {
        state.loadingUsed = true;
        state.errorUsed = null;
      })
      .addCase(fetchUsedVouchers.fulfilled, (state, action) => {
        state.loadingUsed = false;
        state.used = action.payload;
      })
      .addCase(fetchUsedVouchers.rejected, (state, action) => {
        state.loadingUsed = false;
        state.errorUsed = action.payload;
      });
  },
});

export default customerVouchersSlice.reducer;
