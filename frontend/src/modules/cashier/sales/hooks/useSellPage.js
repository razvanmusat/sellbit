import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchActiveWarehouses,
  setSelectedWarehouseId,
  fetchOpenReceipts,
  createNewReceipt,
  fetchActivePaymentMethods,
  registerAdvancePayment,
  addOrUpdateReceiptItem,
  removeReceiptItem,
  clearError,
  fetchCancelReasons,
  cancelReceipt,
  addPaymentToReceipt,
  removePaymentFromReceipt,
  closeReceipt,
  applyVoucherToReceipt
} from '../state/sellPageSlice';

import { invalidateCache } from '../../cashierReports/store/sellReportsSlice';

// 1. IMPORTĂM UTILITARUL CENTRAL
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useSellPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { warehouseId, receiptId } = useParams();
  const { user } = useSelector((state) => state.auth);

  // --- REDUX STATE ---
  const {
    warehouses,
    receipts,
    receiptsLoading,
    paymentMethods,
    paymentMethodsLoading,
    warehousesLoading,
    error, // <--- Aceasta este eroarea care vine din Backend (ex: Stoc insuficient)
    cancelReasons,
    cancelReasonsLoading
  } = useSelector((state) => state.sellPage);

  // --- LOCAL STATE (Modale & UI) ---
  const [modals, setModals] = useState({
    addReceipt: false,
    advance: false,
    addPayment: false,
    cancel: false
  });

  const [feedback, setFeedback] = useState({
    message: null,
    severity: 'warning'
  });

  // Calculare bon curent
  const editingReceipt = useMemo(() => 
    receiptId ? receipts.find(r => r.id == receiptId) : null, 
    [receiptId, receipts]
  );

  // --- ACTIONS (Helpers pentru state local) ---
  const toggleModal = (modalName, isOpen) => {
    setModals(prev => ({ ...prev, [modalName]: isOpen }));
  };

  const showFeedback = (message, severity = 'success') => {
    setFeedback({ message, severity });
  };

  const clearFeedback = () => {
    setFeedback({ ...feedback, message: null });
  };

  // --- EFFECTS ---
  
  // 1. Încărcare date inițiale
  useEffect(() => {
    if (warehouses.length === 0) dispatch(fetchActiveWarehouses());
    dispatch(fetchActivePaymentMethods());
    dispatch(fetchCancelReasons());
  }, [dispatch, warehouses.length]);

  // 2. Încărcare bonuri la schimbarea gestiunii
  useEffect(() => {
    if (warehouseId) {
      dispatch(setSelectedWarehouseId(warehouseId));
      dispatch(fetchOpenReceipts(warehouseId));
    }
  }, [warehouseId, dispatch]);

  // 3. Refresh la schimbarea bonului
  useEffect(() => {
    if (receiptId && warehouseId) {
      dispatch(fetchOpenReceipts(warehouseId));
    }
  }, [receiptId, warehouseId, dispatch]);

  // 4. MONITORIZARE ERORI (NOU)
  // Ascultăm dacă apare o eroare în Redux și o afișăm în Snackbar
  useEffect(() => {
    if (error) {
      const msg = getFriendlyErrorMessage(error);
      showFeedback(msg, 'error');
      
      // Opțional: Curățăm eroarea din Redux imediat, ca să nu rămână agățată
      dispatch(clearError()); 
    }
  }, [error, dispatch]); 


  // --- HANDLERS (Business Logic) ---

  const actions = {
    // Navigare
    changeWarehouse: (e, newValue) => navigate(`/home/sell/${newValue}`),
    openReceipt: (id) => navigate(`/home/sell/${warehouseId}/${id}`),
    backToDashboard: () => navigate(`/home/sell/${warehouseId}`),

    // Creare Bon
    createReceipt: ({ tableName, note }) => {
      if (warehouseId && user?.id) {
        dispatch(createNewReceipt({ warehouseId, tableName, userId: user.id, note }));
        toggleModal('addReceipt', false);
      }
    },

    // Avans Rapid
    createAdvance: ({ amount, paymentMethodCode, note }) => {
      if (warehouseId && user?.id) {
        dispatch(registerAdvancePayment({ warehouseId, amount, paymentMethodCode, userId: user.id, note }));
        showFeedback('Avans înregistrat cu succes!', 'success');
        toggleModal('advance', false);
      }
    },

    // Produse (Add/Update/Remove)
    addProduct: (product) => {
      if (!receiptId || !editingReceipt) return;
      
      const productId = product.id || product;
      const existingItem = editingReceipt.items.find(item => item.productId === productId);
      const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

      dispatch(addOrUpdateReceiptItem({ receiptId, productId, quantity: newQuantity }));
    },

    updateItemQuantity: (receiptId, productId, newQuantity) => {
      dispatch(addOrUpdateReceiptItem({ receiptId, productId, quantity: newQuantity }));
    },

    removeItem: (receiptItemId) => {
      dispatch(removeReceiptItem(receiptItemId));
    },

    // Plăți
    addPayment: async (paymentMethodId, amount, changeDue) => {
      if (receiptId && user?.id) {
        const result = await dispatch(addPaymentToReceipt({
          receiptId, paymentMethodId, amount: parseFloat(amount), userId: user.id
        }));

        if (addPaymentToReceipt.fulfilled.match(result)) {
          dispatch(fetchOpenReceipts(warehouseId));
          showFeedback('Plată adăugată.', 'success');
        } else if (addPaymentToReceipt.rejected.match(result)) {
          throw new Error(result.payload || 'Eroare la adăugarea plății.');
        }
      }
    },

    removePayment: async (paymentId) => {
      if (receiptId && user?.id) {
        const result = await dispatch(removePaymentFromReceipt({ paymentId, userId: user.id, receiptId }));
        if (removePaymentFromReceipt.fulfilled.match(result)) {
          dispatch(fetchOpenReceipts(warehouseId));
          showFeedback('Plata a fost ștearsă.', 'success');
        } else if (removePaymentFromReceipt.rejected.match(result)) {
          throw new Error(result.payload || 'Eroare la ștergerea plății.');
        }
      }
    },

    applyVoucher: async (voucherCode) => {
      if (receiptId && user?.id) {
        const result = await dispatch(applyVoucherToReceipt({ receiptId, voucherCode, userId: user.id }));
        if (applyVoucherToReceipt.fulfilled.match(result)) {
          dispatch(fetchOpenReceipts(warehouseId));
          showFeedback('Voucher aplicat cu succes!', 'success');
        } else if (applyVoucherToReceipt.rejected.match(result)) {
          // La rejected, aruncăm throw pentru ca catch-ul din usePaymentModal să funcționeze
          throw new Error(result.payload || 'Eroare aplicare voucher');
        }
      }
    },

    closeReceipt: async () => {
      if (receiptId) {
        const result = await dispatch(closeReceipt(receiptId));
        if (closeReceipt.fulfilled.match(result)) {
          dispatch(invalidateCache());
          toggleModal('addPayment', false);
          showFeedback('Bon închis cu succes!', 'success');
          actions.backToDashboard();
        }
      }
    },

    // Anulare
    cancelReceipt: async (reasonId) => {
      if (receiptId) {
        const result = await dispatch(cancelReceipt({ receiptId, reasonId }));
        if (cancelReceipt.fulfilled.match(result)) {
          dispatch(invalidateCache());
          toggleModal('cancel', false);
          showFeedback('Bonul a fost anulat cu succes.', 'success');
          actions.backToDashboard();
        }
      }
    },

    afterWarehouseTransfer: () => {
      if (warehouseId) {
        dispatch(fetchOpenReceipts(warehouseId));
      }
      dispatch(invalidateCache());
    },
    
    // Erori
    clearError: () => dispatch(clearError()),
    clearFeedback
  };

  return {
    // Data
    warehouseId,
    receiptId,
    warehouses,
    receipts,
    editingReceipt,
    paymentMethods,
    cancelReasons,
    user,
    
    // Loading States
    loading: {
      receipts: receiptsLoading,
      paymentMethods: paymentMethodsLoading,
      cancelReasons: cancelReasonsLoading,
      warehouses: warehousesLoading
    },
    
    // UI States
    modals,
    toggleModal,
    feedback,
    error,
    
    // Utilitar
    getFriendlyErrorMessage,

    // Actions
    actions
  };
};

export default useSellPage;