import { useState, useEffect, useMemo, useCallback } from 'react';
import { PaymentService } from '../api/PaymentService';

export const usePaymentModal = ({ 
    open, 
    receipt, 
    paymentMethods, 
    onAddPayment, 
    onApplyVoucher, 
    onRemovePayment, 
    onCloseReceipt 
}) => {
    // --- STATE ---
    const [amount, setAmount] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    
    const [changeDue, setChangeDue] = useState(0); 
    const [lastChange, setLastChange] = useState(0);

    const [localPayments, setLocalPayments] = useState([]);
    
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    
    // --- TOAST STATE ---
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState('success'); 

    // --- FETCHING ---
    const refreshPayments = useCallback(async (showSpinner = false) => {
        if (!receipt?.id) return;
        if (showSpinner) setIsInitialLoading(true);
        try {
            const data = await PaymentService.getPaymentsByReceipt(receipt.id);
            setLocalPayments(data || []);
        } catch (err) {
            console.error("Eroare la încărcarea plăților:", err);
        } finally {
            if (showSpinner) setIsInitialLoading(false);
        }
    }, [receipt?.id]);

    useEffect(() => {
        if (open) {
            refreshPayments(true);
            setChangeDue(0);
            setLastChange(0);
            setAmount('');
            setVoucherCode('');
            setToastOpen(false);
            setPaymentMethodId(''); 
        }
    }, [open, refreshPayments]);

    // --- CALCULATE ---
    const { totalPaid, remainingAmount, isFullyPaid } = useMemo(() => {
        const paid = localPayments.reduce((sum, p) => sum + p.amount, 0);
        const rawRemaining = receipt.totalAmount - paid;
        const rem = rawRemaining > 0.001 ? Math.round(rawRemaining * 100) / 100 : 0;
        return { totalPaid: paid, remainingAmount: rem, isFullyPaid: rem === 0 };
    }, [localPayments, receipt.totalAmount]);

    const selectedMethod = useMemo(() => 
        paymentMethods.find(m => m.id === paymentMethodId), 
    [paymentMethods, paymentMethodId]);

    const isVoucher = selectedMethod?.code === 'VOUCHER';

    // Auto-fill Sumă
    useEffect(() => {
        if (open && !isVoucher && remainingAmount > 0) {
            setAmount(remainingAmount.toFixed(2));
            setChangeDue(0); 
        }
    }, [remainingAmount, isVoucher, open]);

    // --- HELPERS ---
    const showToast = (msg, severity = 'warning') => { 
        setToastMessage(msg); 
        setToastSeverity(severity);
        setToastOpen(true); 
    };
    
    const handleCloseToast = () => setToastOpen(false);

    // --- HANDLERS ---
    const handleAmountChange = (e) => {
        const val = e.target.value;
        setAmount(val);
        const numVal = parseFloat(val);
        
        if (selectedMethod?.code === 'CASH' && numVal > remainingAmount) {
            setChangeDue(numVal - remainingAmount);
        } else {
            setChangeDue(0);
        }
    };

    const handleRemove = async (id) => {
        await onRemovePayment(id);
        setLastChange(0); 
        refreshPayments(false);
    };

    const handleSubmit = async () => {
        if (isFullyPaid) { onCloseReceipt(); return; }

        // Validările rămân cu Toast local (galben/warning)
        if (!paymentMethodId) { showToast("Te rog selectează metoda de plată!", "warning"); return; }

        if (isVoucher) {
            if (!voucherCode) return;
            await onApplyVoucher(voucherCode);
            setVoucherCode('');
            setPaymentMethodId('');
            refreshPayments(false); 
            // Aici poți lăsa mesajul dacă vrei confirmare specifică pt voucher, sau îl scoți și pe ăsta
            showToast("Voucher aplicat cu succes.", "success");
            return;
        }

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) return;
        
        let amountToSend = numAmount;
        let currentChange = 0;

        if (selectedMethod?.code === 'CASH') {
            if (numAmount > remainingAmount) {
                amountToSend = remainingAmount;
                currentChange = numAmount - remainingAmount;
            }
        } else {
            if (numAmount > remainingAmount) {
                showToast(`Suma introdusă prea mare!`, "warning");
                setAmount(remainingAmount.toFixed(2));
                return;
            }
        }

        if (currentChange > 0) {
            setLastChange(currentChange);
        }

        // Aici Părintele (SellPage) va declanșa Toast-ul global la succes
        await onAddPayment(paymentMethodId, amountToSend, changeDue);

        refreshPayments(false); 
        setChangeDue(0);
        setPaymentMethodId(''); 
        
        // --- AM ȘTERS TOAST-UL DE AICI PENTRU A EVITA DUBLAREA ---
        // showToast("Plată adăugată.", "success"); 
    };

    return {
        amount, setAmount,
        voucherCode, setVoucherCode,
        paymentMethodId, setPaymentMethodId,
        changeDue,
        lastChange,
        localPayments,
        isInitialLoading,
        toastOpen, toastMessage, toastSeverity, handleCloseToast,
        totalPaid, remainingAmount, isFullyPaid, isVoucher,
        handleAmountChange,
        handleRemove,
        handleSubmit
    };
};