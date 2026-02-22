import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PaymentService } from '../api/PaymentService';
import { VoucherCampaignService } from '../../../admin/vouchers/api/VoucherCampaignService';

export const usePaymentModal = ({ 
    open, 
    receipt, 
    paymentMethods, 
    onAddPayment, 
    onApplyVoucher, 
    onRemovePayment, 
    onCloseReceipt 
}) => {
    const voucherBlockKey = `sellbit_blocked_vouchers_${receipt?.id || 'unknown'}`;

    // --- STATE ---
    const [amount, setAmount] = useState('');
    const [voucherPrefix, setVoucherPrefix] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    
    const [changeDue, setChangeDue] = useState(0); 
    const [lastChange, setLastChange] = useState(0);

    const [localPayments, setLocalPayments] = useState([]);
    const [activePrefixes, setActivePrefixes] = useState([]);
    
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    
    // --- TOAST STATE ---
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState('success'); 
    const blockedVoucherCodesRef = useRef(new Set());

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

    // Track cu useRef dacă modalul tocmai s-a deschis (previne loop-uri)
    const previousOpenRef = useRef(false);

    useEffect(() => {
        if (!receipt?.id) return;
        try {
            const raw = sessionStorage.getItem(voucherBlockKey);
            const parsed = raw ? JSON.parse(raw) : [];
            blockedVoucherCodesRef.current = new Set(Array.isArray(parsed) ? parsed : []);
        } catch {
            blockedVoucherCodesRef.current = new Set();
        }
    }, [receipt?.id, voucherBlockKey]);

    useEffect(() => {
        if (open && !previousOpenRef.current) {
            // Modal tocmai s-a deschis - resetăm totul
            refreshPayments(true);
            setChangeDue(0);
            setLastChange(0);
            setAmount('');
            setVoucherPrefix('');
            setVoucherCode('');
            setToastOpen(false);
            setPaymentMethodId('');
            
            // Fetch active prefixes pentru voucher
            VoucherCampaignService.getActivePrefixes()
                .then(prefixes => {
                    setActivePrefixes(prefixes || []);
                    // Dacă există un singur prefix, selectăm automat
                    if (prefixes && prefixes.length === 1) {
                        setVoucherPrefix(prefixes[0]);
                    }
                })
                .catch(err => console.error('Eroare la încărcarea prefixelor:', err));
        }
        
        // Salvăm starea curentă pentru următorul render
        previousOpenRef.current = open;
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

    // Auto-selectează prefixul când user selectează metoda VOUCHER și există un singur prefix
    useEffect(() => {
        if (isVoucher && activePrefixes.length === 1 && !voucherPrefix) {
            setVoucherPrefix(activePrefixes[0]);
        }
    }, [isVoucher, activePrefixes, voucherPrefix]);

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
            if (!voucherPrefix || !voucherCode) return;
            
            // Combinăm prefix + cod
            const fullVoucherCode = `${voucherPrefix}-${voucherCode}`;
            const normalizedCode = fullVoucherCode.trim().toUpperCase();

            if (blockedVoucherCodesRef.current.has(normalizedCode)) {
                showToast('Acest voucher a fost deja folosit pe bonul curent și nu poate fi reaplicat.', 'warning');
                return;
            }
            
            try {
                await onApplyVoucher(normalizedCode);
                blockedVoucherCodesRef.current.add(normalizedCode);
                sessionStorage.setItem(voucherBlockKey, JSON.stringify(Array.from(blockedVoucherCodesRef.current)));
                // Doar la SUCCES resetăm câmpurile
                setVoucherPrefix('');
                setVoucherCode('');
                setPaymentMethodId('');
                refreshPayments(false);
            } catch (err) {
                // La EROARE nu resetăm nimic - utilizatorul poate corecta codul
                console.error('Eroare aplicare voucher:', err);
                // Opțional: focus pe câmpul de cod pentru editare rapidă
            }
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
        voucherPrefix, setVoucherPrefix,
        voucherCode, setVoucherCode,
        activePrefixes,
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