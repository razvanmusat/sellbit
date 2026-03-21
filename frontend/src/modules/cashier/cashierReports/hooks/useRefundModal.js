import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ReceiptItemService } from '../../sales/api/ReceiptItemService';
import { SalesService } from '../../sales/api/SalesService';
import { PaymentService } from '../../sales/api/PaymentService';
import { invalidateCache } from '../store/sellReportsSlice';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useRefundModal = (open, receipt, onClose, onRefundSuccess) => {
    const [items, setItems] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [voucherAmount, setVoucherAmount] = useState(0);
    const [originalPayments, setOriginalPayments] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [refundMap, setRefundMap] = useState({});
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [refundNote, setRefundNote] = useState('');

    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState('error');

    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        if (open && receipt?.id) {
            setRefundMap({});
            setPaymentMethodId('');
            setRefundNote('');
            setToastOpen(false);
            setVoucherAmount(0);
            setOriginalPayments([]);
            fetchInitialData();
        }
    }, [open, receipt]);

    const fetchInitialData = async () => {
        setLoadingItems(true);
        try {
            const itemsData = await ReceiptItemService.getItemsByReceipt(receipt.id);
            setItems(Array.isArray(itemsData) ? itemsData : []);

            const methodsData = await PaymentService.getActivePaymentMethods();
            if (Array.isArray(methodsData)) {
                const allowedCodes = ['CASH', 'CARD', 'BANK_TRANSFER'];
                setPaymentMethods(methodsData.filter(m => allowedCodes.includes(m.code)));
            }

            const paymentsData = await PaymentService.getPaymentsByReceipt(receipt.id);
            if (Array.isArray(paymentsData)) {
                setOriginalPayments(paymentsData);
                const totalVoucher = paymentsData
                    .filter(p => p.paymentMethodCode === 'VOUCHER')
                    .reduce((sum, p) => sum + (p.amount || 0), 0);
                setVoucherAmount(totalVoucher);
            }
        } catch (err) {
            console.error("Eroare date:", err);
            showToast("Nu s-au putut încărca datele bonului.", 'error');
        } finally {
            setLoadingItems(false);
        }
    };

    const showToast = (message, severity = 'error') => {
        setToastMessage(message);
        setToastSeverity(severity);
        setToastOpen(true);
    };

    const handleCloseToast = (event, reason) => {
        if (reason === 'clickaway') return;
        setToastOpen(false);
    };

    const getRefundLimit = (item) =>
        item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity;

    const handleIncrement = (item) => {
        const limit = getRefundLimit(item);
        const currentQty = refundMap[item.id] || 0;
        if (currentQty < limit) {
            setRefundMap(prev => ({ ...prev, [item.id]: currentQty + 1 }));
        }
    };

    const handleDecrement = (item) => {
        const currentQty = refundMap[item.id] || 0;
        if (currentQty > 0) {
            if (currentQty - 1 === 0) {
                const newMap = { ...refundMap };
                delete newMap[item.id];
                setRefundMap(newMap);
            } else {
                setRefundMap(prev => ({ ...prev, [item.id]: currentQty - 1 }));
            }
        }
    };

    const handleToggleCheck = (item) => {
        const limit = getRefundLimit(item);
        if (limit <= 0) return;
        if (refundMap[item.id]) {
            const newMap = { ...refundMap };
            delete newMap[item.id];
            setRefundMap(newMap);
        } else {
            setRefundMap(prev => ({ ...prev, [item.id]: limit }));
        }
    };

    const handleSubmitRefund = async () => {
        if (!paymentMethodId) {
            showToast("Te rog selectează metoda de restituire.", 'warning');
            return;
        }
        setSubmitting(true);

        try {
            const itemsPayload = Object.entries(refundMap).map(([itemId, qty]) => ({
                receiptItemId: parseInt(itemId),
                quantityToRefund: parseFloat(qty)
            }));

            const request = {
                userId: user?.id,
                paymentMethodId,
                note: refundNote?.trim() || null,
                items: itemsPayload
            };

            await SalesService.createPartialRefund(receipt.id, request);
            dispatch(invalidateCache());
            onRefundSuccess();
            onClose();
        } catch (err) {
            const msg = getFriendlyErrorMessage(err) || "Eroare la retur.";
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const totalRefundAmount = items.reduce((acc, item) => {
        if (refundMap[item.id]) return acc + (item.unitPrice * refundMap[item.id]);
        return acc;
    }, 0);

    const receiptTotalAmount = receipt?.totalAmount || 0;
    const adjustedRefundAmount = receiptTotalAmount > 0
        ? totalRefundAmount - (totalRefundAmount / receiptTotalAmount) * voucherAmount
        : totalRefundAmount;

    const hasSelection = Object.keys(refundMap).length > 0;

    return {
        state: {
            items,
            originalPayments,
            paymentMethods,
            loadingItems,
            submitting,
            toastOpen,
            toastMessage,
            toastSeverity,
            refundMap,
            paymentMethodId,
            refundNote,
            totalRefundAmount: adjustedRefundAmount,
            hasSelection
        },
        setters: { setPaymentMethodId, setRefundNote },
        handlers: {
            getRefundLimit,
            handleIncrement,
            handleDecrement,
            handleToggleCheck,
            handleSubmitRefund,
            handleCloseToast
        }
    };
};