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
  lastFetchParams: {
    availableFromDate: null,
    availableToDate: null,
    usedFromDate: null,
    usedToDate: null,
  },
};

const customerVouchersSlice = createSlice({
  name: 'customerVouchers',
  initialState,
  reducers: {
    invalidateVouchers: (state) => {
      state.available = [];
      state.used = [];
      state.lastFetchParams = initialState.lastFetchParams;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableVouchers.pending, (state) => {
        state.loadingAvailable = true;
        state.errorAvailable = null;
      })
      .addCase(fetchAvailableVouchers.fulfilled, (state, action) => {
        state.loadingAvailable = false;
        state.available = action.payload;
        state.lastFetchParams.availableFromDate = action.meta.arg.fromDate;
        state.lastFetchParams.availableToDate = action.meta.arg.toDate;
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
        state.lastFetchParams.usedFromDate = action.meta.arg.fromDate;
        state.lastFetchParams.usedToDate = action.meta.arg.toDate;
      })
      .addCase(fetchUsedVouchers.rejected, (state, action) => {
        state.loadingUsed = false;
        state.errorUsed = action.payload;
      });
  },
});

export const { invalidateVouchers } = customerVouchersSlice.actions;
export default customerVouchersSlice.reducer;
