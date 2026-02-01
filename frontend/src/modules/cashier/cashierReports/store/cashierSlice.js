import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { WarehouseService } from '../../sales/api/WarehouseService'; 

// Thunk inteligent: Descarcă doar dacă lista e goală!
export const fetchCashierWarehouses = createAsyncThunk(
  'cashier/fetchWarehouses',
  async (_, { getState }) => {
    const { warehouses } = getState().cashier;
    
    // DACA AVEM DEJA DATE, NU MAI FACEM REQUEST (Zero Flicker)
    if (warehouses && warehouses.length > 0) {
        return warehouses; 
    }

    // Altfel, le luăm de pe server
    const response = await WarehouseService.getActiveWarehouses();
    return response || [];
  }
);

const cashierSlice = createSlice({
  name: 'cashier',
  initialState: {
    warehouses: [], // Aici stocăm lista "cache-uită"
    loading: false,
    error: null,
  },
  reducers: {
     // Nu avem nevoie de reducers pentru selecție, o ținem local
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCashierWarehouses.pending, (state) => {
        // Punem loading true doar dacă nu avem deja date
        if (state.warehouses.length === 0) {
            state.loading = true;
        }
      })
      .addCase(fetchCashierWarehouses.fulfilled, (state, action) => {
        state.loading = false;
        state.warehouses = action.payload;
      })
      .addCase(fetchCashierWarehouses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default cashierSlice.reducer;