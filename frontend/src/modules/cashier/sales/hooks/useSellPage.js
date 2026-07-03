import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchActiveWarehouses,
  fetchOpenReceipts,
  createNewReceipt,
  fetchActivePaymentMethods,
  registerAdvancePayment,
  registerGiftCard,
  addOrUpdateReceiptItem,
  removeReceiptItem,
  clearError,
  fetchCancelReasons,
  cancelReceipt,
  addPaymentToReceipt,
  removePaymentFromReceipt,
  closeReceipt,
  closeReceiptManual,
  applyVoucherToReceipt,
} from "../state/sellPageSlice";

import { invalidateCache } from "../../cashierReports/store/sellReportsSlice";
import { getFriendlyErrorMessage } from "../../../../shared/utils/errorHandler";
import { SalesService } from "../api/SalesService";

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
    giftCard: false,
    addPayment: false,
    cancel: false,
  });

  // State pentru dialogul post-close (print vouchere / loyalty)
  const [voucherIssuance, setVoucherIssuance] = useState(null); // { vouchers, loyaltyCampaign, receiptId }
  const [giftCardStatus, setGiftCardStatus] = useState({ active: false, campaignId: null });
  const [fiscalStatus, setFiscalStatus] = useState(null);
  const [fiscalPendingReceiptId, setFiscalPendingReceiptId] = useState(null);

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
    // Verifică starea campaniei gift card
    import('../../../admin/vouchers/api/VoucherCampaignService').then(({ VoucherCampaignService }) => {
      VoucherCampaignService.getGiftCardStatus()
        .then(status => setGiftCardStatus(status))
        .catch(() => {});
    });
  }, [dispatch, warehouses.length]);

  useEffect(() => {
    dispatch(fetchOpenReceipts());
  }, [dispatch]);

  useEffect(() => {
    if (receiptId) dispatch(fetchOpenReceipts());
  }, [receiptId, dispatch]);

  useEffect(() => {
    import('../api/FiscalService').then(({ FiscalService }) => {
      FiscalService.getStatus()
        .then(data => setFiscalStatus(data.active))
        .catch(() => setFiscalStatus(false));
    });
  }, [receiptId]);

  useEffect(() => {
    if (!modals.addPayment && !modals.fiscal) return;
    const checkStatus = () => {
      import('../api/FiscalService').then(({ FiscalService }) => {
        FiscalService.getStatus()
          .then(data => setFiscalStatus(data.active))
          .catch(() => setFiscalStatus(false));
      });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [modals.addPayment, modals.fiscal]);

  // Polling stare bon fiscal (FISCAL_PENDING → CLOSED sau FISCAL_FAILED)
  useEffect(() => {
    if (!fiscalPendingReceiptId) return;
    const poll = () => dispatch(fetchOpenReceipts());
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [fiscalPendingReceiptId, dispatch]);

  // Reacție la schimbarea statusului bonului aflat în procesare fiscală
  useEffect(() => {
    if (!fiscalPendingReceiptId) return;
    const receipt = receipts.find(r => r.id === fiscalPendingReceiptId);
    if (!receipt) {
      // Bon dispărut din lista activă → CLOSED prin reconciliere.
      // Dialogul de vouchere nu a apărut la close — îl reconstruim din DB.
      const closedReceiptId = fiscalPendingReceiptId;
      setFiscalPendingReceiptId(null);
      dispatch(invalidateCache());
      SalesService.getVoucherIssuance(closedReceiptId)
        .then((issuance) => {
          const hasVouchers = issuance?.vouchers?.length > 0;
          const hasLoyalty = !!issuance?.loyaltyCampaign;
          if (hasVouchers || hasLoyalty) {
            setVoucherIssuance({
              vouchers: issuance.vouchers || [],
              loyaltyCampaign: issuance.loyaltyCampaign || null,
              receiptId: closedReceiptId,
            });
          } else {
            setFeedback({ message: "Bon fiscal emis și bon închis cu succes!", severity: "success" });
            navigate("/home/sell");
          }
        })
        .catch(() => {
          setFeedback({ message: "Bon fiscal emis și bon închis cu succes!", severity: "success" });
          navigate("/home/sell");
        });
      return;
    }
    if (receipt.statusCode === 'FISCAL_FAILED') {
      setFiscalPendingReceiptId(null);
      setFeedback({ message: "Tipărire fiscală eșuată. Verifică casa de marcat și reîncearcă.", severity: "error" });
    }
  }, [receipts, fiscalPendingReceiptId, dispatch, navigate]);

  // Dacă bonul deschis este deja FISCAL_PENDING la reload pagină, pornește polling automat
  useEffect(() => {
    if (editingReceipt?.statusCode === 'FISCAL_PENDING' && !fiscalPendingReceiptId) {
      setFiscalPendingReceiptId(editingReceipt.id);
    }
  }, [editingReceipt?.statusCode, editingReceipt?.id, fiscalPendingReceiptId]);

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

    // Returnează true dacă modalul se poate închide (succes sau bon rămas în procesare la casă)
    createAdvance: async ({ warehouseId, amount, paymentMethodCode, note, skipFiscal = false }) => {
      if (!user?.id) return false;
      const result = await dispatch(
        registerAdvancePayment({
          warehouseId,
          amount,
          paymentMethodCode,
          userId: user.id,
          note,
          skipFiscal,
        }),
      );
      if (registerAdvancePayment.fulfilled.match(result)) {
        dispatch(invalidateCache());
        showFeedback(skipFiscal ? "Avans înregistrat manual (fără bon fiscal)." : "Avans înregistrat cu succes!", "success");
        toggleModal("advance", false);
        return true;
      }
      // Incert: jobul e la Fisco, bonul rămâne FISCAL_PENDING → reconcilierea îl finalizează automat
      const errorCode = result.payload || "";
      const stillPending = errorCode.includes("POLLING_LOST")
        || errorCode.includes("TIMEOUT")
        || errorCode.includes("INTERRUPTED");
      if (stillPending) {
        dispatch(clearError());
        dispatch(invalidateCache());
        toggleModal("advance", false);
        setFeedback({ message: "Avans în procesare la casa de marcat — se finalizează automat.", severity: "info" });
        dispatch(fetchOpenReceipts());
        return true;
      }
      // Eșec sigur: bonul a fost șters — eroarea apare prin snackbar-ul global, modalul rămâne deschis
      dispatch(fetchOpenReceipts());
      return false;
    },

    // Returnează { closed, issued }: closed = modalul se poate închide; issued = voucherul de printat (sau null)
    createGiftCard: async ({ warehouseId, amount, paymentMethodCode, note, skipFiscal = false }) => {
      if (!user?.id) return { closed: false, issued: null };
      const result = await dispatch(
        registerGiftCard({
          warehouseId,
          amount,
          paymentMethodCode,
          userId: user.id,
          note,
          skipFiscal,
        }),
      );
      if (registerGiftCard.fulfilled.match(result)) {
        dispatch(invalidateCache());
        toggleModal("giftCard", false);
        return { closed: true, issued: result.payload };
      }
      const errorCode = result.payload || "";
      const stillPending = errorCode.includes("POLLING_LOST")
        || errorCode.includes("TIMEOUT")
        || errorCode.includes("INTERRUPTED");
      if (stillPending) {
        dispatch(clearError());
        dispatch(invalidateCache());
        toggleModal("giftCard", false);
        setFeedback({
          message: "Card cadou în procesare la casa de marcat — voucherul se emite automat; deschide bonul «Card Cadou» din listă pentru cod.",
          severity: "info",
        });
        dispatch(fetchOpenReceipts());
        return { closed: true, issued: null };
      }
      dispatch(fetchOpenReceipts());
      return { closed: false, issued: null };
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
          const { issuanceResult, receiptId: closedReceiptId } = result.payload;
          const hasVouchers = issuanceResult?.vouchers?.length > 0;
          const hasLoyalty = !!issuanceResult?.loyaltyCampaign;
          if (hasVouchers || hasLoyalty) {
            setVoucherIssuance({
              vouchers: issuanceResult.vouchers || [],
              loyaltyCampaign: issuanceResult.loyaltyCampaign || null,
              receiptId: closedReceiptId,
            });
          } else {
            showFeedback("Bon închis cu succes!", "success");
            actions.backToDashboard();
          }
        } else if (closeReceipt.rejected.match(result)) {
          const errorCode = result.payload || '';
          const leavesFiscalPending = errorCode.includes('POLLING_LOST')
            || errorCode.includes('TIMEOUT')
            || errorCode.includes('PRINT_FAILED')
            || errorCode.includes('INTERRUPTED');
          if (leavesFiscalPending) {
            // Bonul este FISCAL_PENDING — suprimă eroarea globală și pornește polling
            dispatch(clearError());
            setFiscalPendingReceiptId(parseInt(receiptId));
            setFeedback({ message: "Bon în procesare la casa de marcat. Verificare automată în curs...", severity: "info" });
          }
          // Re-fetch în orice caz de eroare: dacă TX2 (completeFiscalClose) a eșuat după print,
          // bonul e FISCAL_PENDING în DB — efectul de auto-resume îl detectează și pornește polling.
          await dispatch(fetchOpenReceipts());
        }
      }
    },

    closeReceiptManual: async () => {
      if (receiptId) {
        const result = await dispatch(closeReceiptManual(receiptId));
        if (closeReceiptManual.fulfilled.match(result)) {
          dispatch(invalidateCache());
          toggleModal("addPayment", false);
          const { issuanceResult, receiptId: closedReceiptId } = result.payload;
          const hasVouchers = issuanceResult?.vouchers?.length > 0;
          const hasLoyalty = !!issuanceResult?.loyaltyCampaign;
          if (hasVouchers || hasLoyalty) {
            setVoucherIssuance({
              vouchers: issuanceResult.vouchers || [],
              loyaltyCampaign: issuanceResult.loyaltyCampaign || null,
              receiptId: closedReceiptId,
            });
          } else {
            showFeedback("Bon închis manual.", "success");
            actions.backToDashboard();
          }
        }
      }
    },

    dismissVoucherIssuance: () => {
      setVoucherIssuance(null);
      showFeedback("Bon închis cu succes!", "success");
      actions.backToDashboard();
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
    voucherIssuance,
    giftCardStatus,
    fiscalStatus,
    fiscalPendingReceiptId,
  };
};

export default useSellPage;