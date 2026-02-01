import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { ReservationsService } from '../api/ReservationsService';

// --- THUNKS (Acțiuni Asincrone) ---

/**
 * 1. Fetch Rezervări
 * Primește data ca string 'YYYY-MM-DD'.
 */
export const fetchReservations = createAsyncThunk(
  'reservations/fetchByDay',
  async (dateString, { rejectWithValue }) => {
    try {
      const data = await ReservationsService.getByDay(dateString);
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-au putut încărca rezervările.');
    }
  }
);

// --- SLICE ---

const initialState = {
  // Stocăm data ca string (YYYY-MM-DD) pentru a fi serializabilă în Redux
  selectedDate: dayjs().format('YYYY-MM-DD'), 
  reservations: [], // Lista de rezervări pentru data selectată
  loading: false,
  error: null,
  
  // Flag pentru a ști dacă am inițializat vreodată datele (pentru prima încărcare)
  isInitialized: false 
};

const reservationsSlice = createSlice({
  name: 'reservations',
  initialState,
  reducers: {
    // Schimbarea datei din Calendar
    setSelectedDate(state, action) {
      state.selectedDate = action.payload;
    },
    // Resetare completă (opțional, la logout)
    resetReservationsState(state) {
        return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch ---
      .addCase(fetchReservations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservations.fulfilled, (state, action) => {
        state.loading = false;
        state.reservations = action.payload;
        state.isInitialized = true;
      })
      .addCase(fetchReservations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedDate, resetReservationsState } = reservationsSlice.actions;
export default reservationsSlice.reducer;