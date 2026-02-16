import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ReceiptItemService } from '../../sales/api/ReceiptItemService';
import { SalesService } from '../../sales/api/SalesService';
import { PaymentService } from '../../sales/api/PaymentService';

export const useRefundModal = (open, receipt, onClose, onRefundSuccess) => {
    // --- STATE ---
    const [items, setItems] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    
    const [loadingItems, setLoadingItems] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [refundMap, setRefundMap] = useState({});
    const [paymentMethodId, setPaymentMethodId] = useState(''); 

    const { user } = useSelector((state) => state.auth); 

    // --- EFFECT ---
    useEffect(() => {
        if (open && receipt?.id) {
            setRefundMap({});
            setPaymentMethodId(''); 
            setError(null);
            fetchInitialData();
        }
    }, [open, receipt]);

    // --- API CALLS ---
    const fetchInitialData = async () => {
        setLoadingItems(true);
        try {
            const itemsData = await ReceiptItemService.getItemsByReceipt(receipt.id);
            if (Array.isArray(itemsData)) {
                setItems(itemsData);
            } else {
                setItems([]);
            }

            const methodsData = await PaymentService.getActivePaymentMethods();
            if (Array.isArray(methodsData)) {
                const allowedCodes = ['CASH', 'CARD', 'BANK_TRANSFER'];
                const filteredMethods = methodsData.filter(method => allowedCodes.includes(method.code));
                setPaymentMethods(filteredMethods);
            }
        } catch (err) {
            console.error("Eroare date:", err);
            setError("Nu s-au putut încărca datele bonului.");
        } finally {
            setLoadingItems(false);
        }
    };

    // --- LOGIC ---
    const getRefundLimit = (item) => {
        return item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity;
    };

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
            setError("Te rog selectează metoda de restituire.");
            return;
        }
        setSubmitting(true);
        setError(null);

        try {
            const itemsPayload = Object.entries(refundMap).map(([itemId, qty]) => ({
                receiptItemId: parseInt(itemId),
                quantityToRefund: parseFloat(qty)
            }));

            const request = {
                userId: user?.id,
                paymentMethodId: paymentMethodId,
                items: itemsPayload
            };

            await SalesService.createPartialRefund(receipt.id, request);
            onRefundSuccess(); 
            onClose(); 
        } catch (err) {
            const msg = err.response?.data?.message || "Eroare la retur.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // --- DERIVED STATE ---
    const totalRefundAmount = items.reduce((acc, item) => {
        if (refundMap[item.id]) {
            return acc + (item.unitPrice * refundMap[item.id]);
        }
        return acc;
    }, 0);

    const hasSelection = Object.keys(refundMap).length > 0;

    return {
        state: {
            items,
            paymentMethods,
            loadingItems,
            submitting,
            error,
            refundMap,
            paymentMethodId,
            totalRefundAmount,
            hasSelection
        },
        setters: {
            setPaymentMethodId
        },
        handlers: {
            getRefundLimit,
            handleIncrement,
            handleDecrement,
            handleToggleCheck,
            handleSubmitRefund
        }
    };
};