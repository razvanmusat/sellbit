import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import { WarehouseService } from '../api/WarehouseService';
import { SalesService } from '../api/SalesService';
import { PaymentService } from '../api/PaymentService';
import { ReceiptItemService } from '../api/ReceiptItemService';
import { CancelReasonService } from '../api/CancelReasonService';

// --- 1. THUNKS ---

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

export const fetchOpenReceipts = createAsyncThunk(
  'sellPage/fetchOpenReceipts',
  async (_, { rejectWithValue }) => {
    try {
      return await SalesService.getActiveReceipts();
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-au putut încărca bonurile.');
    }
  }
);

export const createNewReceipt = createAsyncThunk(
  'sellPage/createNewReceipt',
  async ({ tableName, userId, note }, { rejectWithValue }) => {
    try {
      return await SalesService.createReceipt({ tableName, userId, note });
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-a putut crea bonul.');
    }
  }
);

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

export const registerAdvancePayment = createAsyncThunk(
  'sellPage/registerAdvancePayment',
  async ({ warehouseId, amount, paymentMethodCode, userId, note, skipFiscal }, { rejectWithValue }) => {
    try {
      await SalesService.registerAdvancePayment({ warehouseId, amount, paymentMethodCode, userId, note }, skipFiscal);
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-a putut înregistra avansul.');
    }
  }
);

export const addOrUpdateReceiptItem = createAsyncThunk(
  'sellPage/addOrUpdateReceiptItem',
  async ({ receiptId, productId, quantity, warehouseId }, { rejectWithValue }) => {
    try {
      return await ReceiptItemService.addOrUpdateItem(receiptId, productId, quantity, warehouseId);
    } catch (error) {
      if (error.params && error.message) return rejectWithValue(error);
      if (error.response?.data) return rejectWithValue(error.response.data);
      return rejectWithValue(error.message || 'Eroare la procesare.');
    }
  }
);

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

// ADD PAYMENT — acum include warehouseId (gestiunea pe care merge cash-ul)
export const addPaymentToReceipt = createAsyncThunk(
  'sellPage/addPaymentToReceipt',
  async ({ receiptId, paymentMethodId, amount, userId, warehouseId }, { rejectWithValue }) => {
    try {
      await PaymentService.addPayment(receiptId, paymentMethodId, amount, userId, warehouseId);
      return receiptId;
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la adăugarea plății.');
    }
  }
);

export const applyVoucherToReceipt = createAsyncThunk(
  'sellPage/applyVoucherToReceipt',
  async ({ receiptId, voucherCode, userId, distributions }, { rejectWithValue }) => {
    try {
      await PaymentService.applyVoucher(receiptId, voucherCode, userId, distributions);
      return receiptId;
    } catch (error) {
      return rejectWithValue(error.message || 'Voucher invalid.');
    }
  }
);

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

export const closeReceipt = createAsyncThunk(
  'sellPage/closeReceipt',
  async (receiptId, { rejectWithValue }) => {
    try {
      const issuanceResult = await SalesService.closeReceipt(receiptId);
      // Returnăm atât receiptId cât și voucherele emise
      return { receiptId: Number(receiptId), issuanceResult: issuanceResult || { vouchers: [], loyaltyCampaign: null } };
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la închiderea bonului.');
    }
  }
);

export const closeReceiptManual = createAsyncThunk(
  'sellPage/closeReceiptManual',
  async (receiptId, { rejectWithValue }) => {
    try {
      const issuanceResult = await SalesService.closeReceipt(receiptId, true);
      return { receiptId: Number(receiptId), issuanceResult: issuanceResult || { vouchers: [], loyaltyCampaign: null } };
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la închiderea bonului.');
    }
  }
);

export const confirmPrintedFiscal = createAsyncThunk(
  'sellPage/confirmPrintedFiscal',
  async (receiptId, { rejectWithValue }) => {
    try {
      const issuanceResult = await SalesService.confirmPrinted(receiptId);
      return { receiptId: Number(receiptId), issuanceResult: issuanceResult || { vouchers: [], loyaltyCampaign: null } };
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la confirmarea bonului.');
    }
  }
);

export const retryNotPrintedFiscal = createAsyncThunk(
  'sellPage/retryNotPrintedFiscal',
  async (receiptId, { rejectWithValue }) => {
    try {
      const issuanceResult = await SalesService.retryNotPrinted(receiptId);
      return { receiptId: Number(receiptId), issuanceResult: issuanceResult || { vouchers: [], loyaltyCampaign: null } };
    } catch (error) {
      return rejectWithValue(error.message || 'Eroare la reîncercarea închiderii bonului.');
    }
  }
);

export const registerGiftCard = createAsyncThunk(
  'sellPage/registerGiftCard',
  async ({ warehouseId, amount, paymentMethodCode, userId, note, skipFiscal }, { rejectWithValue }) => {
    try {
      return await SalesService.registerGiftCard({ warehouseId, amount, paymentMethodCode, userId, note }, skipFiscal);
    } catch (error) {
      return rejectWithValue(error.message || 'Nu s-a putut vinde cardul cadou.');
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
  warehousesLoading: 'idle',
  receiptsLoading: 'idle',
  paymentMethodsLoading: 'idle',
  cancelReasonsLoading: 'idle',
  error: null,
};

// --- 3. SLICE ---

const sellPageSlice = createSlice({
  name: 'sellPage',
  initialState,
  reducers: {
    setSelectedWarehouseId: (state, action) => {
      state.selectedWarehouseId = action.payload;
    },
    resetSellPageState: () => initialState,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
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

      .addCase(createNewReceipt.fulfilled, (state, action) => {
        state.receipts.unshift(action.payload);
        state.error = null;
      })

      .addCase(cancelReceipt.fulfilled, (state, action) => {
        state.receipts = state.receipts.filter(r => r.id !== action.payload);
        state.error = null;
      })
      .addCase(closeReceipt.pending, (state) => { state.receiptsLoading = 'pending'; })
      .addCase(closeReceipt.fulfilled, (state, action) => {
        state.receipts = state.receipts.filter(r => r.id !== action.payload.receiptId);
        state.receiptsLoading = 'succeeded';
        state.error = null;
      })
      .addCase(closeReceiptManual.pending, (state) => { state.receiptsLoading = 'pending'; })
      .addCase(closeReceiptManual.fulfilled, (state, action) => {
        state.receipts = state.receipts.filter(r => r.id !== action.payload.receiptId);
        state.receiptsLoading = 'succeeded';
        state.error = null;
      })
      .addCase(confirmPrintedFiscal.pending, (state) => { state.receiptsLoading = 'pending'; })
      .addCase(confirmPrintedFiscal.fulfilled, (state, action) => {
        state.receipts = state.receipts.filter(r => r.id !== action.payload.receiptId);
        state.receiptsLoading = 'succeeded';
        state.error = null;
      })
      .addCase(retryNotPrintedFiscal.pending, (state) => { state.receiptsLoading = 'pending'; })
      .addCase(retryNotPrintedFiscal.fulfilled, (state, action) => {
        state.receipts = state.receipts.filter(r => r.id !== action.payload.receiptId);
        state.receiptsLoading = 'succeeded';
        state.error = null;
      })

      .addMatcher(
        isAnyOf(addOrUpdateReceiptItem.fulfilled, removeReceiptItem.fulfilled),
        (state, action) => {
          const index = state.receipts.findIndex(r => r.id === action.payload.id);
          if (index !== -1) state.receipts[index] = action.payload;
          state.error = null;
        }
      )

      .addMatcher(
        isAnyOf(
          registerAdvancePayment.fulfilled,
          addPaymentToReceipt.fulfilled,
          applyVoucherToReceipt.fulfilled,
          removePaymentFromReceipt.fulfilled
        ),
        (state) => { state.error = null; }
      )

      // Erorile acestor acțiuni sunt gestionate local în modal (toast) — nu le punem în state.error global
      .addMatcher(
        isAnyOf(
          addPaymentToReceipt.rejected,
          removePaymentFromReceipt.rejected,
          applyVoucherToReceipt.rejected
        ),
        (state) => {
          if (state.receiptsLoading === 'pending') state.receiptsLoading = 'failed';
        }
      )

      .addMatcher(
        (action) => {
          const locallyHandled = [
            'sellPage/addPaymentToReceipt/rejected',
            'sellPage/removePaymentFromReceipt/rejected',
            'sellPage/applyVoucherToReceipt/rejected',
          ];
          return action.type.endsWith('/rejected')
            && action.type.startsWith('sellPage/')
            && !locallyHandled.includes(action.type);
        },
        (state, action) => {
          state.error = action.payload;
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