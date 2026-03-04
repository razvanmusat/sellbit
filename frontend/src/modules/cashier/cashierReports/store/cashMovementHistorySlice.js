import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CashMovementService } from '../api/CashMovementService';
// Async thunk pentru movementTypes
export const fetchCashMovementTypes = createAsyncThunk(
  'cashMovementHistory/fetchTypes',
  async () => {
    const typesData = await CashMovementService.getActiveTypes();
    // Filtrăm REFUND_CARD
    return (typesData || []).filter(t => t.code !== 'REFUND_CARD');
  }
);

// Cheia de cache: warehouseId_startDate_endDate_type
const makeKey = (warehouseId, startDate, endDate, type) => `${warehouseId}_${startDate}_${endDate}_${type || ''}`;

export const fetchCashMovementHistory = createAsyncThunk(
  'cashMovementHistory/fetch',
  async ({ warehouseId, startDate, endDate, type }, { getState }) => {
    const key = makeKey(warehouseId, startDate, endDate, type);
    const cached = getState().cashMovementHistory.cache[key];
    if (cached) return { key, data: cached };
    const data = await CashMovementService.getHistory(warehouseId, startDate, endDate);
    return { key, data };
  }
);

const cashMovementHistorySlice = createSlice({
  name: 'cashMovementHistory',
  initialState: {
    cache: {},
    loading: false,
    error: null,
    movementTypes: [],
    typesLoading: false,
    typesError: null,
  },
  reducers: {
    resetCache: (state) => {
      state.cache = {};
    },
    resetTypes: (state) => {
      state.movementTypes = [];
      state.typesLoading = false;
      state.typesError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCashMovementHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashMovementHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.cache[action.payload.key] = action.payload.data || [];
      })
      .addCase(fetchCashMovementHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Eroare la încărcare istoric.';
      })
      // movementTypes
      .addCase(fetchCashMovementTypes.pending, (state) => {
        state.typesLoading = true;
        state.typesError = null;
      })
      .addCase(fetchCashMovementTypes.fulfilled, (state, action) => {
        state.typesLoading = false;
        state.typesError = null;
        state.movementTypes = action.payload;
      })
      .addCase(fetchCashMovementTypes.rejected, (state, action) => {
        state.typesLoading = false;
        state.typesError = action.error.message || 'Eroare la încărcare tipuri.';
      });
  },
});


export const { resetCache, resetTypes } = cashMovementHistorySlice.actions;
export default cashMovementHistorySlice.reducer;
