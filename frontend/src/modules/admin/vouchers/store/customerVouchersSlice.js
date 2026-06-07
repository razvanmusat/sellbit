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

export const fetchAnnulledVouchers = createAsyncThunk(
  'customerVouchers/fetchAnnulled',
  async ({ fromDate, toDate }, { rejectWithValue }) => {
    try {
      const data = await CustomerVoucherService.getAnnulled(fromDate, toDate);
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la încărcarea voucherelor anulate');
    }
  }
);

export const fetchExpiredVouchers = createAsyncThunk(
  'customerVouchers/fetchExpired',
  async ({ fromDate, toDate }, { rejectWithValue }) => {
    try {
      const data = await CustomerVoucherService.getExpired(fromDate, toDate);
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la încărcarea voucherelor expirate');
    }
  }
);

const initialState = {
  available: [],
  used: [],
  annulled: [],
  expired: [],
  loadingAvailable: false,
  loadingUsed: false,
  loadingAnnulled: false,
  loadingExpired: false,
  errorAvailable: null,
  errorUsed: null,
  errorAnnulled: null,
  errorExpired: null,
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
      })
      .addCase(fetchAnnulledVouchers.pending, (state) => {
        state.loadingAnnulled = true;
        state.errorAnnulled = null;
      })
      .addCase(fetchAnnulledVouchers.fulfilled, (state, action) => {
        state.loadingAnnulled = false;
        state.annulled = action.payload;
      })
      .addCase(fetchAnnulledVouchers.rejected, (state, action) => {
        state.loadingAnnulled = false;
        state.errorAnnulled = action.payload;
      })
      .addCase(fetchExpiredVouchers.pending, (state) => {
        state.loadingExpired = true;
        state.errorExpired = null;
      })
      .addCase(fetchExpiredVouchers.fulfilled, (state, action) => {
        state.loadingExpired = false;
        state.expired = action.payload;
      })
      .addCase(fetchExpiredVouchers.rejected, (state, action) => {
        state.loadingExpired = false;
        state.errorExpired = action.payload;
      });
  },
});

export default customerVouchersSlice.reducer;
