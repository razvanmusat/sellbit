import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchActiveWarehouses,
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
  applyVoucherToReceipt,
} from "../state/sellPageSlice";

import { invalidateCache } from "../../cashierReports/store/sellReportsSlice";
import { getFriendlyErrorMessage } from "../../../../shared/utils/errorHandler";

export const useSellPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { receiptId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const {
    warehouses,
    receipts,
    receiptsLoading,
    paymentMethods,
    paymentMethodsLoading,
    warehousesLoading,
    error,
    cancelReasons,
    cancelReasonsLoading,
  } = useSelector((state) => state.sellPage);

  const isAdmin = user?.authorityLevel === 100;

  const filteredWarehouses = useMemo(
    () => warehouses.filter((w) => w.code !== "GP"),
    [warehouses],
  );

  const visibleReceipts = useMemo(
    () => isAdmin ? receipts : receipts.filter((r) => r.userName === user?.fullName),
    [receipts, isAdmin, user?.fullName],
  );

  const [modals, setModals] = useState({
    addReceipt: false,
    advance: false,
    addPayment: false,
    cancel: false,
  });

  const [feedback, setFeedback] = useState({
    message: null,
    severity: "warning",
  });

  const editingReceipt = useMemo(
    () => (receiptId ? receipts.find((r) => r.id == receiptId) : null),
    [receiptId, receipts],
  );

  const toggleModal = (modalName, isOpen) => {
    setModals((prev) => ({ ...prev, [modalName]: isOpen }));
  };

  const showFeedback = (message, severity = "success") => {
    setFeedback({ message, severity });
  };

  const clearFeedback = () => {
    setFeedback((prev) => ({ ...prev, message: null }));
  };

  useEffect(() => {
    if (warehouses.length === 0) dispatch(fetchActiveWarehouses());
    dispatch(fetchActivePaymentMethods());
    dispatch(fetchCancelReasons());
  }, [dispatch, warehouses.length]);

  useEffect(() => {
    dispatch(fetchOpenReceipts());
  }, [dispatch]);

  useEffect(() => {
    if (receiptId) dispatch(fetchOpenReceipts());
  }, [receiptId, dispatch]);

  useEffect(() => {
    if (error) {
      const msg = getFriendlyErrorMessage(error);
      showFeedback(msg, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const actions = {
    openReceipt: (id) => navigate(`/home/sell/${id}`),
    backToDashboard: () => navigate("/home/sell"),

    createReceipt: ({ tableName, note }) => {
      if (user?.id) {
        dispatch(createNewReceipt({ tableName, userId: user.id, note }));
        toggleModal("addReceipt", false);
      }
    },

    createAdvance: async ({ warehouseId, amount, paymentMethodCode, note }) => {
      if (user?.id) {
        const result = await dispatch(
          registerAdvancePayment({
            warehouseId,
            amount,
            paymentMethodCode,
            userId: user.id,
            note,
          }),
        );
        if (registerAdvancePayment.fulfilled.match(result)) {
          dispatch(invalidateCache());
          showFeedback("Avans înregistrat cu succes!", "success");
          toggleModal("advance", false);
        }
      }
    },

    addProduct: (product, warehouseId, quantity = 1) => {
      if (!receiptId || !editingReceipt || !warehouseId) return;
      const productId = product.id || product;
      const existingItem = editingReceipt.items.find(
        (item) =>
          item.productId === productId && item.warehouseId === warehouseId,
      );
      const newQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;
      dispatch(
        addOrUpdateReceiptItem({
          receiptId,
          productId,
          quantity: newQuantity,
          warehouseId,
        }),
      );
    },

    updateItemQuantity: (receiptId, productId, newQuantity, warehouseId) => {
      dispatch(
        addOrUpdateReceiptItem({
          receiptId,
          productId,
          quantity: newQuantity,
          warehouseId,
        }),
      );
    },

    removeItem: (receiptItemId) => {
      return dispatch(removeReceiptItem(receiptItemId));
    },

    addPayment: async (paymentMethodId, amount, changeDue, warehouseId) => {
      if (receiptId && user?.id) {
        const result = await dispatch(
          addPaymentToReceipt({
            receiptId,
            paymentMethodId,
            amount: parseFloat(amount),
            userId: user.id,
            warehouseId,
          }),
        );
        if (addPaymentToReceipt.fulfilled.match(result)) {
          dispatch(fetchOpenReceipts());
          showFeedback("Plată adăugată.", "success");
        } else if (addPaymentToReceipt.rejected.match(result)) {
          throw new Error(result.payload || "Eroare la adăugarea plății.");
        }
      }
    },

    removePayment: async (paymentId) => {
      if (receiptId && user?.id) {
        const result = await dispatch(
          removePaymentFromReceipt({ paymentId, userId: user.id, receiptId }),
        );
        if (removePaymentFromReceipt.fulfilled.match(result)) {
          dispatch(fetchOpenReceipts());
          showFeedback("Plata a fost ștearsă.", "success");
        } else if (removePaymentFromReceipt.rejected.match(result)) {
          throw new Error(result.payload || "Eroare la ștergerea plății.");
        }
      }
    },

    applyVoucher: async (voucherCode, distributions = null) => {
      if (receiptId && user?.id) {
        const result = await dispatch(
          applyVoucherToReceipt({
            receiptId,
            voucherCode,
            userId: user.id,
            distributions,
          }),
        );
        if (applyVoucherToReceipt.fulfilled.match(result)) {
          dispatch(fetchOpenReceipts());
          showFeedback("Voucher aplicat cu succes!", "success");
        } else if (applyVoucherToReceipt.rejected.match(result)) {
          throw new Error(result.payload || "Eroare aplicare voucher");
        }
      }
    },

    closeReceipt: async () => {
      if (receiptId) {
        const result = await dispatch(closeReceipt(receiptId));
        if (closeReceipt.fulfilled.match(result)) {
          dispatch(invalidateCache());
          toggleModal("addPayment", false);
          showFeedback("Bon închis cu succes!", "success");
          actions.backToDashboard();
        }
      }
    },

    cancelReceipt: async (reasonId) => {
      if (receiptId) {
        const result = await dispatch(cancelReceipt({ receiptId, reasonId }));
        if (cancelReceipt.fulfilled.match(result)) {
          dispatch(invalidateCache());
          toggleModal("cancel", false);
          showFeedback("Bonul a fost anulat cu succes.", "success");
          actions.backToDashboard();
        }
      }
    },

    clearError: () => dispatch(clearError()),
    clearFeedback,
  };

  return {
    receiptId,
    warehouses: filteredWarehouses,
    receipts: visibleReceipts,
    editingReceipt,
    paymentMethods,
    cancelReasons,
    user,
    loading: {
      receipts: receiptsLoading,
      paymentMethods: paymentMethodsLoading,
      cancelReasons: cancelReasonsLoading,
      warehouses: warehousesLoading,
    },
    modals,
    toggleModal,
    feedback,
    error,
    getFriendlyErrorMessage,
    actions,
  };
};

export default useSellPage;