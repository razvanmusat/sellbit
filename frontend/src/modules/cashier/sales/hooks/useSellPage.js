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
    if (receiptId) return undefined;
    const hasFiscalPending = visibleReceipts.some((r) => r.statusCode === 'FISCAL_PENDING');
    if (!hasFiscalPending) return undefined;

    const interval = setInterval(() => {
      dispatch(fetchOpenReceipts());
    }, 5000);

    return () => clearInterval(interval);
  }, [receiptId, visibleReceipts, dispatch]);

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

  // Dacă bonul deschis e deja FISCAL_PENDING (ex: pagina s-a reîncărcat în timp ce Fisco
  // n-a apucat să răspundă) — backend-ul verifică/reconciliază singur starea la casă:
  // închide dacă s-a tipărit, readuce pe OPEN (sau șterge bonul direct) dacă e sigur că
  // comanda nu a ajuns. Daca ramane pending, casierul primeste mesaj si revine in lista.
  useEffect(() => {
    if (editingReceipt?.statusCode !== 'FISCAL_PENDING') return;
    const id = editingReceipt.id;
    SalesService.checkFiscalPending(id)
      .then(async (closed) => {
        if (closed) {
          dispatch(invalidateCache());
          dispatch(fetchOpenReceipts());
          showFeedback("Bon fiscal emis și bon închis cu succes!", "success");
          navigate("/home/sell");
          return;
        }
        // Reconcilierea din backend poate schimba starea bonului — citim starea reală
        const fetchResult = await dispatch(fetchOpenReceipts());
        const updated = fetchResult.payload?.find((r) => Number(r.id) === Number(id));
        if (!updated) {
          // Bon direct șters la reconciliere — comanda sigur nu a ajuns la casă
          showFeedback("Comanda nu a ajuns la casa de marcat — încasarea a fost anulată. Reia operațiunea.", "warning");
          navigate("/home/sell");
        } else if (updated.statusCode === 'OPEN') {
          showFeedback("Comanda nu a ajuns la casa de marcat. Bonul a revenit pe deschis — reia închiderea.", "warning");
        } else if (updated.statusCode === 'FISCAL_PENDING') {
          showFeedback("Bonul este încă în procesare fiscală. Sellbit verifică automat casa de marcat la fiecare 30 de secunde.", "warning");
          navigate("/home/sell");
        }
      })
      .catch(() => {
        showFeedback("Nu se poate verifica acum casa de marcat. Bonul rămâne în procesare fiscală și va fi verificat automat.", "warning");
        navigate("/home/sell");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingReceipt?.statusCode, editingReceipt?.id]);

  useEffect(() => {
    if (error) {
      const msg = getFriendlyErrorMessage(error);
      showFeedback(msg, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const actions = {
    openReceipt: (id) => {
      const receipt = receipts.find((r) => Number(r.id) === Number(id));
      if (receipt?.statusCode === 'FISCAL_PENDING') {
        showFeedback("Bonul este in procesare fiscala. Sellbit il verifica automat.", "warning");
        return;
      }
      navigate(`/home/sell/${id}`);
    },
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
      // Incert: nu s-a confirmat clar tipărirea — bonul rămâne FISCAL_PENDING, vizibil în listă
      // ca „Avans Petrecere". Nu se rezolvă singur — deschide-l din listă ca să confirmi.
      const errorCode = result.payload || "";
      const stillPending = errorCode.includes("POLLING_LOST")
        || errorCode.includes("TIMEOUT")
        || errorCode.includes("INTERRUPTED")
        || errorCode.includes("STILL_PROCESSING");
      if (stillPending) {
        dispatch(clearError());
        dispatch(invalidateCache());
        toggleModal("advance", false);
        setFeedback({ message: "Casa de marcat n-a confirmat tipărirea. Deschide bonul „Avans Petrecere\" din listă pentru a confirma.", severity: "warning" });
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
        || errorCode.includes("INTERRUPTED")
        || errorCode.includes("STILL_PROCESSING");
      if (stillPending) {
        dispatch(clearError());
        dispatch(invalidateCache());
        toggleModal("giftCard", false);
        setFeedback({
          message: "Casa de marcat n-a confirmat tipărirea. Deschide bonul „Card Cadou\" din listă pentru a confirma — voucherul se emite abia după confirmare.",
          severity: "warning",
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
          // Re-fetch ca să vedem statusul REAL al bonului după eroare — dacă backend-ul a
          // putut confirma clar (respins/conexiune moartă), bonul revine singur pe OPEN.
          const fetchResult = await dispatch(fetchOpenReceipts());
          const updated = fetchResult.payload?.find((r) => Number(r.id) === Number(receiptId));
          if (updated?.statusCode === 'FISCAL_PENDING') {
            dispatch(clearError());
            toggleModal("addPayment", false);
            dispatch(invalidateCache());
            showFeedback("Bonul este în procesare fiscală. Sellbit verifică automat casa de marcat și va actualiza bonul când primește rezultat clar.", "warning");
            actions.backToDashboard();
          }
          // Altfel: eroare clară (bon revenit pe OPEN) — toast-ul standard de eroare o arată deja.
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
  };
};

export default useSellPage;
