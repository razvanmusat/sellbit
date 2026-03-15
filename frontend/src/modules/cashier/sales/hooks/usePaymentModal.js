import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PaymentService } from '../api/PaymentService';
import { VoucherCampaignService } from '../../../admin/vouchers/api/VoucherCampaignService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

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

    const [amount, setAmount] = useState('');
    const [voucherPrefix, setVoucherPrefix] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [changeDue, setChangeDue] = useState(0);
    const [lastChange, setLastChange] = useState(0);
    const [localPayments, setLocalPayments] = useState([]);
    const [activePrefixes, setActivePrefixes] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(false);

    // Un singur picker pentru toate tipurile de plată inclusiv voucher
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingPayment, setPendingPayment] = useState(null);
    // pendingPayment: { methodId, amount, change } pentru plăți normale
    //                 { voucherCode, amount } pentru voucher

    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState('success');
    const blockedVoucherCodesRef = useRef(new Set());
    const previousOpenRef = useRef(false);

    // --- GESTIUNI DIN BON ---
    const warehouseTotals = useMemo(() => {
        const map = {};
        (receipt?.items || []).forEach(item => {
            if (!item.warehouseId) return;
            if (!map[item.warehouseId]) {
                map[item.warehouseId] = {
                    warehouseId: item.warehouseId,
                    warehouseName: item.warehouseName,
                    total: 0,
                };
            }
            map[item.warehouseId].total = Math.round((map[item.warehouseId].total + (item.lineTotal || 0)) * 100) / 100;
        });
        return Object.values(map);
    }, [receipt?.items]);

    const isSingleWarehouse = warehouseTotals.length <= 1;

    // --- PLĂȚI EFECTUATE PER GESTIUNE ---
    const paidPerWarehouse = useMemo(() => {
        const map = {};
        localPayments.forEach(p => {
            if (p.warehouseId) {
                map[p.warehouseId] = Math.round(((map[p.warehouseId] || 0) + p.amount) * 100) / 100;
            }
        });
        return map;
    }, [localPayments]);

    const remainingPerWarehouse = useMemo(() => {
        return warehouseTotals.map(wh => ({
            ...wh,
            paid: paidPerWarehouse[wh.warehouseId] || 0,
            remaining: Math.max(0, Math.round((wh.total - (paidPerWarehouse[wh.warehouseId] || 0)) * 100) / 100),
        }));
    }, [warehouseTotals, paidPerWarehouse]);

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

    // --- CALCULATE GLOBALE ---
    const { totalPaid, remainingAmount, isFullyPaid } = useMemo(() => {
        const paid = localPayments.reduce((sum, p) => sum + p.amount, 0);
        const rawRemaining = receipt.totalAmount - paid;
        const rem = rawRemaining > 0.001 ? Math.round(rawRemaining * 100) / 100 : 0;
        return { totalPaid: paid, remainingAmount: rem, isFullyPaid: rem === 0 };
    }, [localPayments, receipt.totalAmount]);

    const isMultiPaymentMode = localPayments.length > 0 && !isFullyPaid;

    const selectedMethod = useMemo(() =>
        paymentMethods.find(m => m.id === paymentMethodId),
        [paymentMethods, paymentMethodId]);

    const isVoucher = selectedMethod?.code === 'VOUCHER';

    // --- RESET LA DESCHIDERE ---
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
            refreshPayments(true);
            setChangeDue(0);
            setLastChange(0);
            setAmount('');
            setVoucherPrefix('');
            setVoucherCode('');
            setToastOpen(false);
            setPaymentMethodId('');
            setPickerOpen(false);
            setPendingPayment(null);

            VoucherCampaignService.getActivePrefixes()
                .then(prefixes => {
                    setActivePrefixes(prefixes || []);
                    if (prefixes && prefixes.length === 1) setVoucherPrefix(prefixes[0]);
                })
                .catch(err => console.error('Eroare prefixe:', err));
        }
        previousOpenRef.current = open;
    }, [open, refreshPayments]);

    useEffect(() => {
        if (open && !isVoucher && remainingAmount > 0) {
            setAmount(remainingAmount.toFixed(2));
            setChangeDue(0);
        }
    }, [remainingAmount, isVoucher, open]);

    useEffect(() => {
        if (isVoucher && activePrefixes.length === 1 && !voucherPrefix) {
            setVoucherPrefix(activePrefixes[0]);
        }
    }, [isVoucher, activePrefixes, voucherPrefix]);

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
        if (!paymentMethodId) { showToast("Te rog selectează metoda de plată!", "warning"); return; }

        // --- VOUCHER ---
        if (isVoucher) {
            if (!voucherPrefix || !voucherCode) return;
            const fullCode = `${voucherPrefix}-${voucherCode}`.trim().toUpperCase();

            if (blockedVoucherCodesRef.current.has(fullCode)) {
                showToast('Acest voucher a fost deja folosit pe bonul curent.', 'warning');
                return;
            }

            try {
                // Preview — obținem suma fără a consuma voucherul
                const preview = await PaymentService.previewVoucher(receipt.id, fullCode);
                const voucherAmt = preview.amount;

                if (isSingleWarehouse) {
                    // O singură gestiune → aplicăm direct
                    const whId = warehouseTotals[0]?.warehouseId || null;
                    const distributions = whId ? [{ warehouseId: whId, amount: voucherAmt }] : null;
                    await onApplyVoucher(fullCode, distributions);
                    blockedVoucherCodesRef.current.add(fullCode);
                    sessionStorage.setItem(voucherBlockKey, JSON.stringify(Array.from(blockedVoucherCodesRef.current)));
                    setVoucherPrefix('');
                    setVoucherCode('');
                    setPaymentMethodId('');
                    refreshPayments(false);
                } else {
                    // Mai multe gestiuni → același picker ca la plăți normale
                    // casierul selectează gestiunea pe care se aplică voucherul
                    setPendingPayment({ voucherCode: fullCode, amount: voucherAmt });
                    setPickerOpen(true);
                }
            } catch (err) {
                showToast(getFriendlyErrorMessage(err), 'error');
            }
            return;
        }

        // --- PLATĂ NORMALĂ ---
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) return;

        let amountToSend = numAmount;
        let currentChange = 0;

        if (selectedMethod?.code === 'CASH') {
            if (numAmount > remainingAmount) {
                amountToSend = remainingAmount;
                currentChange = parseFloat((numAmount - remainingAmount).toFixed(2));
            }
        } else {
            if (numAmount > remainingAmount) {
                showToast('Suma introdusă prea mare!', 'warning');
                setAmount(remainingAmount.toFixed(2));
                return;
            }
        }

        if (currentChange > 0) setLastChange(currentChange);

        if (isSingleWarehouse) {
            const whId = warehouseTotals[0]?.warehouseId || null;
            await onAddPayment(paymentMethodId, amountToSend, currentChange, whId);
            refreshPayments(false);
            setChangeDue(0);
            setPaymentMethodId('');
            return;
        }

        if (amountToSend >= remainingAmount - 0.001) {
            await splitAndPayProportionally(paymentMethodId, amountToSend, currentChange);
            refreshPayments(false);
            setChangeDue(0);
            setPaymentMethodId('');
            return;
        }

        setPendingPayment({ methodId: paymentMethodId, amount: amountToSend, change: currentChange });
        setPickerOpen(true);
    };

    const splitAndPayProportionally = async (methodId, totalAmount, change) => {
        const entries = remainingPerWarehouse.filter(wh => wh.remaining > 0);
        if (entries.length === 0) return;

        let allocated = 0;
        for (let i = 0; i < entries.length; i++) {
            const wh = entries[i];
            let whAmount;
            if (i === entries.length - 1) {
                whAmount = parseFloat((totalAmount - allocated).toFixed(2));
            } else {
                whAmount = parseFloat((totalAmount * (wh.remaining / remainingAmount)).toFixed(2));
                allocated += whAmount;
            }
            if (whAmount <= 0) continue;
            await onAddPayment(methodId, whAmount, i === 0 ? change : 0, wh.warehouseId);
        }
    };

    /**
     * Casierul a selectat gestiunea din picker.
     * Dacă e voucher → aplicăm cu distributions pe gestiunea selectată.
     * Dacă e plată normală → addPayment pe gestiunea selectată.
     */
    const handlePickerSelect = async (warehouseId) => {
        if (!pendingPayment) return;
        setPickerOpen(false);

        if (pendingPayment.voucherCode) {
            // Voucher — distribuție pe gestiunea selectată de casier
            try {
                const distributions = [{ warehouseId, amount: pendingPayment.amount }];
                await onApplyVoucher(pendingPayment.voucherCode, distributions);
                blockedVoucherCodesRef.current.add(pendingPayment.voucherCode);
                sessionStorage.setItem(voucherBlockKey, JSON.stringify(Array.from(blockedVoucherCodesRef.current)));
                setVoucherPrefix('');
                setVoucherCode('');
                setPaymentMethodId('');
            } catch (err) {
                showToast(getFriendlyErrorMessage(err), 'error');
            }
        } else {
            // Plată normală
            await onAddPayment(pendingPayment.methodId, pendingPayment.amount, pendingPayment.change, warehouseId);
        }

        setPendingPayment(null);
        refreshPayments(false);
        setChangeDue(0);
        setPaymentMethodId('');
    };

    const handlePickerClose = () => {
        setPickerOpen(false);
        setPendingPayment(null);
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
        handleAmountChange, handleRemove, handleSubmit,
        isMultiPaymentMode,
        warehouseTotals,
        remainingPerWarehouse,
        pickerOpen,
        pendingPayment,
        handlePickerSelect,
        handlePickerClose,
    };
};