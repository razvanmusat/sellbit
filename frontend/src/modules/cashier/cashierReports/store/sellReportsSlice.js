import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SalesService } from '../../sales/api/SalesService';

export const fetchSellReports = createAsyncThunk(
  'sellReports/fetchReports',
  async ({ warehouseId, date }, { getState, rejectWithValue }) => {
    const cacheKey = `${warehouseId}_${date.format('YYYY-MM-DD')}`;
    const state = getState();

    if (state.sellReports?.cached?.[cacheKey]) {
      console.log(`[Cache HIT] ${cacheKey} - SKIP API`);
      return {
        receipts: state.sellReports.cached[cacheKey],
        cacheKey,
        fromCache: true,
      };
    }

    console.log(`[Cache MISS] ${cacheKey} - API CALL`);
    try {
      const start = date.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = date.endOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const data = await SalesService.getReceiptsReport(warehouseId, 'CLOSED', start, end);
      console.log(`[API SUCCESS] ${data?.length || 0} receipts`);

      return { receipts: data || [], cacheKey, fromCache: false };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Eroare la încărcare');
    }
  }
);

const sellReportsSlice = createSlice({
  name: 'sellReports',
  initialState: {
    receipts: [],
    loading: false,
    error: null,
    cached: {},
    invalidatedAt: null,
  },
  reducers: {
    clearReports: (state) => {
      state.receipts = [];
      state.cached = {};
      state.error = null;
    },
    invalidateCache: (state, action) => {
      if (action.payload?.cacheKey) {
        delete state.cached[action.payload.cacheKey];
        state.receipts = [];
      } else {
        state.cached = {};
        state.receipts = [];
        state.invalidatedAt = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSellReports.fulfilled, (state, action) => {
        const { receipts, cacheKey } = action.payload;
        state.receipts = receipts;
        state.cached[cacheKey] = receipts;
        state.loading = false;
      })
      .addCase(fetchSellReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Eroare la încărcare rapoarte';
      });
  },
});

export const { clearReports, invalidateCache } = sellReportsSlice.actions;
export default sellReportsSlice.reducer;