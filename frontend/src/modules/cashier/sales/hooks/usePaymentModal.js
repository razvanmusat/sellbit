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
    const [amount, setAmount] = useState('');
    const [voucherPrefix, setVoucherPrefix] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [changeDue, setChangeDue] = useState(0);
    const [lastChange, setLastChange] = useState(0);
    const [localPayments, setLocalPayments] = useState([]);
    const [activePrefixes, setActivePrefixes] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(false);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingPayment, setPendingPayment] = useState(null);

    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState('success');
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
            setChangeDue(Math.round((numVal - remainingAmount) * 100) / 100);
        } else {
            setChangeDue(0);
        }
    };

    const handleRemove = async (id) => {
        await onRemovePayment(id);
        setLastChange(0);
        await refreshPayments(false);
    };

    const handleSubmit = async () => {
        if (isFullyPaid) { onCloseReceipt(); return; }
        if (!paymentMethodId) { showToast("Te rog selectează metoda de plată!", "warning"); return; }

        // --- VOUCHER ---
        if (isVoucher) {
            if (!voucherPrefix || !voucherCode) return;
            const fullCode = `${voucherPrefix}-${voucherCode}`.trim().toUpperCase();

            if (localPayments.some(p => p.voucherCode === fullCode)) {
                showToast('Acest voucher a fost deja folosit pe bonul curent.', 'warning');
                return;
            }

            try {
                const preview = await PaymentService.previewVoucher(receipt.id, fullCode);
                const voucherAmt = preview.amount;

                if (isSingleWarehouse) {
                    const whId = warehouseTotals[0]?.warehouseId || null;
                    const distributions = whId ? [{ warehouseId: whId, amount: voucherAmt }] : null;
                    await onApplyVoucher(fullCode, distributions);
                    setVoucherPrefix('');
                    setVoucherCode('');
                    setPaymentMethodId('');
                    await refreshPayments(false);
                } else {
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

        try {
            if (isSingleWarehouse) {
                const whId = warehouseTotals[0]?.warehouseId || null;
                await onAddPayment(paymentMethodId, amountToSend, currentChange, whId);
                await refreshPayments(false);
                setChangeDue(0);
                setPaymentMethodId('');
                return;
            }

            // Multi-gestiune: dacă suma acoperă tot ce a rămas → split proporțional automat
            if (amountToSend >= remainingAmount - 0.001) {
                await splitAndPayProportionally(paymentMethodId, amountToSend, currentChange);
                await refreshPayments(false);
                setChangeDue(0);
                setPaymentMethodId('');
                return;
            }
        } catch (err) {
            showToast(getFriendlyErrorMessage(err), 'error');
            return;
        }

        // Suma parțială → picker
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
     *
     * Dacă suma depășește ce mai e de plătit pe gestiunea selectată,
     * surplusul se distribuie automat pe celelalte gestiuni cu remaining > 0.
     */
    const handlePickerSelect = async (warehouseId) => {
        if (!pendingPayment) return;
        setPickerOpen(false);

        if (pendingPayment.voucherCode) {
            try {
                const distributions = [{ warehouseId, amount: pendingPayment.amount }];
                await onApplyVoucher(pendingPayment.voucherCode, distributions);
                setVoucherPrefix('');
                setVoucherCode('');
                setPaymentMethodId('');
            } catch (err) {
                showToast(getFriendlyErrorMessage(err), 'error');
            }
        } else {
            try {
                // Cât mai e de plătit pe gestiunea selectată
                const selectedWh = remainingPerWarehouse.find(wh => wh.warehouseId === warehouseId);
                const maxForSelected = selectedWh?.remaining ?? pendingPayment.amount;

                // Suma care merge pe gestiunea selectată (cel mult cât are de plătit)
                const amountForSelected = parseFloat(Math.min(pendingPayment.amount, maxForSelected).toFixed(2));

                await onAddPayment(pendingPayment.methodId, amountForSelected, pendingPayment.change, warehouseId);

                // Dacă a mai rămas de distribuit, merge pe celelalte gestiuni în ordine
                const leftover = parseFloat((pendingPayment.amount - amountForSelected).toFixed(2));
                if (leftover > 0.001) {
                    const others = remainingPerWarehouse.filter(
                        wh => wh.warehouseId !== warehouseId && wh.remaining > 0
                    );
                    let rest = leftover;
                    for (let i = 0; i < others.length; i++) {
                        const wh = others[i];
                        const whAmount = i === others.length - 1
                            ? parseFloat(rest.toFixed(2))
                            : parseFloat(Math.min(rest, wh.remaining).toFixed(2));
                        if (whAmount <= 0.001) continue;
                        await onAddPayment(pendingPayment.methodId, whAmount, 0, wh.warehouseId);
                        rest = parseFloat((rest - whAmount).toFixed(2));
                        if (rest <= 0.001) break;
                    }
                }
            } catch (err) {
                showToast(getFriendlyErrorMessage(err), 'error');
            }
        }

        setPendingPayment(null);
        await refreshPayments(false);
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