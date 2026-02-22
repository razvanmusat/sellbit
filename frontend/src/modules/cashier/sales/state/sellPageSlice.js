import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import { WarehouseService } from '../api/WarehouseService';
import { SalesService } from '../api/SalesService';
import { PaymentService } from '../api/PaymentService';
import { ReceiptItemService } from '../api/ReceiptItemService';
import { CancelReasonService } from '../api/CancelReasonService';

// --- 1. THUNKS (API CALLS) ---

// FETCH WAREHOUSES
export const fetchActiveWarehouses = createAsyncThunk(
  'sellPage/fetchActiveWarehouses',
  async (_, { rejectWithValue }) => {
    try {
      return await WarehouseService.getActiveWarehouses();
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-au putut încărca gestiunile.');
    }
  }
);

// FETCH OPEN RECEIPTS
export const fetchOpenReceipts = createAsyncThunk(
  'sellPage/fetchOpenReceipts',
  async (warehouseId, { rejectWithValue }) => {
    try {
      return await SalesService.getActiveReceipts(warehouseId);
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-au putut încărca bonurile.');
    }
  }
);

// CREATE RECEIPT
export const createNewReceipt = createAsyncThunk(
  'sellPage/createNewReceipt',
  async ({ warehouseId, tableName, userId, note }, { rejectWithValue }) => {
    try {
      const request = { warehouseId, tableName, userId, note };
      return await SalesService.createReceipt(request);
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-a putut crea bonul.');
    }
  }
);

// FETCH ACTIVE PAYMENT METHODS (Advance)
export const fetchActivePaymentMethods = createAsyncThunk(
  'sellPage/fetchActivePaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      return await PaymentService.getActivePaymentMethods();
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-au putut încărca metodele de plată.');
    }
  }
);

// REGISTER ADVANCE
export const registerAdvancePayment = createAsyncThunk(
  'sellPage/registerAdvancePayment',
  async ({ warehouseId, amount, paymentMethodCode, userId, note }, { rejectWithValue }) => {
    try {
      const request = { warehouseId, amount, paymentMethodCode, userId, note };
      await SalesService.registerAdvancePayment(request);
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-a putut înregistra avansul.');
    }
  }
);

// ADD ITEM
export const addOrUpdateReceiptItem = createAsyncThunk(
  'sellPage/addOrUpdateReceiptItem',
  async ({ receiptId, productId, quantity }, { rejectWithValue }) => {
    try {
      return await ReceiptItemService.addOrUpdateItem(receiptId, productId, quantity);
    } catch (error) {
      // --- FIX PENTRU FETCH ---
      
      // 1. Verificăm dacă eroarea este chiar obiectul JSON trimis de server (are params)
      if (error.params && error.message) {
          return rejectWithValue(error); 
      }
      
      // 2. Verificăm stilul Axios (pentru siguranță)
      if (error.response?.data) {
          return rejectWithValue(error.response.data);
      }
      
      // 3. Fallback
      return rejectWithValue(error.message || 'Eroare la procesare.');
    }
  }
);

// REMOVE ITEM
export const removeReceiptItem = createAsyncThunk(
  'sellPage/removeReceiptItem',
  async (receiptItemId, { rejectWithValue }) => {
    try {
      return await ReceiptItemService.removeItem(receiptItemId);
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la ștergerea produsului.');
    }
  }
);

// FETCH CANCEL REASONS
export const fetchCancelReasons = createAsyncThunk(
  'sellPage/fetchCancelReasons',
  async (_, { rejectWithValue }) => {
    try {
      return await CancelReasonService.getActiveReasons();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// CANCEL RECEIPT
export const cancelReceipt = createAsyncThunk(
  'sellPage/cancelReceipt',
  async ({ receiptId, reasonId }, { rejectWithValue }) => {
    try {
      await CancelReasonService.cancelReceipt(receiptId, reasonId);
      return Number(receiptId); 
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la anularea bonului.');
    }
  }
);

// ADD PAYMENT
export const addPaymentToReceipt = createAsyncThunk(
  'sellPage/addPaymentToReceipt',
  async ({ receiptId, paymentMethodId, amount, userId }, { rejectWithValue }) => {
    try {
      await PaymentService.addPayment(receiptId, paymentMethodId, amount, userId);
      return receiptId; 
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la adăugarea plății.');
    }
  }
);

// APPLY VOUCHER
export const applyVoucherToReceipt = createAsyncThunk(
  'sellPage/applyVoucherToReceipt',
  async ({ receiptId, voucherCode, userId }, { rejectWithValue }) => {
    try {
      await PaymentService.applyVoucher(receiptId, voucherCode, userId);
      return receiptId;
    } catch (error) {
      return rejectWithValue(error.message || 'Voucher invalid.');
    }
  }
);

// REMOVE PAYMENT
export const removePaymentFromReceipt = createAsyncThunk(
  'sellPage/removePaymentFromReceipt',
  async ({ paymentId, userId, receiptId }, { rejectWithValue }) => {
    try {
      await PaymentService.removePayment(paymentId, userId);
      return receiptId;
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la ștergerea plății.');
    }
  }
);

// CLOSE RECEIPT
export const closeReceipt = createAsyncThunk(
  'sellPage/closeReceipt',
  async (receiptId, { rejectWithValue }) => {
    try {
      await SalesService.closeReceipt(receiptId);
      return Number(receiptId);
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la închiderea bonului.');
    }
  }
);

// --- 2. INITIAL STATE ---

const initialState = {
  warehouses: [],
  receipts: [],
  paymentMethods: [],
  cancelReasons: [],
  selectedWarehouseId: null,
  
  // Loading flags
  warehousesLoading: 'idle', 
  receiptsLoading: 'idle',
  paymentMethodsLoading: 'idle',
  cancelReasonsLoading: 'idle',
  
  error: null,
};

// --- 3. SLICE & REDUCERS ---

const sellPageSlice = createSlice({
  name: 'sellPage',
  initialState,
  reducers: {
    setSelectedWarehouseId: (state, action) => {
      state.selectedWarehouseId = action.payload;
      state.receipts = []; 
      state.receiptsLoading = 'idle';
    },
    resetSellPageState: () => {
      return initialState;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- LOADING STATES (Specifici) ---
      .addCase(fetchActiveWarehouses.pending, (state) => { state.warehousesLoading = 'pending'; })
      .addCase(fetchActiveWarehouses.fulfilled, (state, action) => {
        state.warehousesLoading = 'succeeded';
        state.warehouses = action.payload;
      })

      .addCase(fetchOpenReceipts.pending, (state) => { state.receiptsLoading = 'pending'; })
      .addCase(fetchOpenReceipts.fulfilled, (state, action) => {
        state.receiptsLoading = 'succeeded';
        state.receipts = action.payload;
      })

      .addCase(fetchActivePaymentMethods.pending, (state) => { state.paymentMethodsLoading = 'pending'; })
      .addCase(fetchActivePaymentMethods.fulfilled, (state, action) => {
        state.paymentMethodsLoading = 'succeeded';
        state.paymentMethods = action.payload;
      })

      .addCase(fetchCancelReasons.pending, (state) => { state.cancelReasonsLoading = 'pending'; })
      .addCase(fetchCancelReasons.fulfilled, (state, action) => {
        state.cancelReasonsLoading = 'succeeded'; 
        state.cancelReasons = action.payload; 
      })

      // --- CREATE RECEIPT ---
      .addCase(createNewReceipt.fulfilled, (state, action) => {
        state.receipts.unshift(action.payload);
        state.error = null;
      })

      // --- UPDATING ITEMS (Add/Remove) - Grupare ---
      .addMatcher(
        isAnyOf(addOrUpdateReceiptItem.fulfilled, removeReceiptItem.fulfilled),
        (state, action) => {
          const index = state.receipts.findIndex(r => r.id === action.payload.id);
          if (index !== -1) state.receipts[index] = action.payload;
          state.error = null;
        }
      )

      // --- REMOVING RECEIPTS (Cancel/Close) - Grupare ---
      .addMatcher(
        isAnyOf(cancelReceipt.fulfilled, closeReceipt.fulfilled),
        (state, action) => {
          state.receipts = state.receipts.filter(r => r.id !== action.payload);
          state.error = null;
        }
      )

      // --- SIMPLE SUCCESSES (Just Clear Error) ---
      .addMatcher(
        isAnyOf(
            registerAdvancePayment.fulfilled, 
            addPaymentToReceipt.fulfilled, 
            applyVoucherToReceipt.fulfilled, 
            removePaymentFromReceipt.fulfilled
        ),
        (state) => { state.error = null; }
      )

      // --- GLOBAL ERROR HANDLER ---
      // Prinde orice acțiune 'rejected' din acest slice
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type.startsWith('sellPage/'),
        (state, action) => {
          state.error = action.payload;
          
          // Resetăm loading-urile specifice pe 'failed' dacă erau 'pending'
          if (state.warehousesLoading === 'pending') state.warehousesLoading = 'failed';
          if (state.receiptsLoading === 'pending') state.receiptsLoading = 'failed';
          if (state.paymentMethodsLoading === 'pending') state.paymentMethodsLoading = 'failed';
          if (state.cancelReasonsLoading === 'pending') state.cancelReasonsLoading = 'failed';
        }
      );
  },
});

export const { setSelectedWarehouseId, resetSellPageState, clearError } = sellPageSlice.actions;

export default sellPageSlice.reducer;