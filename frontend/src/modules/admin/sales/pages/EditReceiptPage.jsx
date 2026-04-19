import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Snackbar } from '@mui/material';
import { SalesService } from '../api/SalesService';
import { WarehouseService } from '../../../cashier/sales/api/WarehouseService';
import { PaymentService } from '../../../cashier/sales/api/PaymentService';
import { StockCurrentService } from '../../../cashier/sales/api/StockCurrentService';
import OpenedReceiptCard from '../../../cashier/sales/components/receipt/OpenedReceiptCard';
import AddPaymentModal from '../../../cashier/sales/components/modals/AddPaymentModal';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const EditReceiptPage = () => {
    const { receiptId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const [receipt, setReceipt] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [stockMap, setStockMap] = useState({});

    const [editItems, setEditItems] = useState([]);
    const [editPayments, setEditPaymentsState] = useState([]);
    const editPaymentsRef = useRef([]);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    const removedItemRef = useRef(null);
    const fakeIdCounter = useRef(-1);
    const allocateFakeId = () => {
        const id = fakeIdCounter.current;
        fakeIdCounter.current -= 1;
        return id;
    };

    const updateEditPayments = useCallback((newPayments) => {
        editPaymentsRef.current = newPayments;
        PaymentService.setEditModePayments(newPayments);
        setEditPaymentsState(newPayments);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [rec, wh, pm] = await Promise.all([
                    SalesService.getReceiptById(receiptId),
                    WarehouseService.getActiveWarehouses(),
                    PaymentService.getActivePaymentMethods(),
                ]);
                if (rec.internalCorrection || rec.originalReceiptId != null) {
                    setError(getFriendlyErrorMessage({ message: 'ERROR.RECEIPT.CANNOT_EDIT_CORRECTION' }));
                    return;
                }
                const activeWarehouses = wh.filter(w => w.code !== 'GP');
                setReceipt(rec);
                setWarehouses(activeWarehouses);
                setPaymentMethods(pm);
                setEditItems(rec.items || []);

                // Vouchers de pe bonul original se auto-transferă pe bonul nou (backend handled).
                // Le pre-populăm în editPayments ca UI-ul să afișeze balanța corect.
                const carriedVouchers = (rec.payments || [])
                    .filter(p => p.methodCode === 'VOUCHER')
                    .map(p => ({
                        id: allocateFakeId(),
                        paymentMethodLabel: p.methodLabel || 'Voucher',
                        methodCode: 'VOUCHER',
                        warehouseId: p.warehouseId || null,
                        warehouseName: p.warehouseName || null,
                        amount: parseFloat(parseFloat(p.amount).toFixed(2)),
                        autoCarried: true,
                    }));
                updateEditPayments(carriedVouchers);

                // Preload stocuri per (productId, warehouseId) pentru produsele cu trackStock
                const stockPairs = [];
                (rec.items || []).forEach(item => {
                    if (!item.trackStock) return;
                    activeWarehouses.forEach(w => {
                        stockPairs.push({ productId: item.productId, warehouseId: w.id });
                    });
                });
                const stockResults = await Promise.all(
                    stockPairs.map(({ productId, warehouseId }) =>
                        StockCurrentService.getProductStockLive(warehouseId, productId)
                            .then(qty => ({ productId, warehouseId, qty: Number(qty) }))
                            .catch(() => ({ productId, warehouseId, qty: 0 }))
                    )
                );
                const map = {};
                stockResults.forEach(({ productId, warehouseId, qty }) => {
                    map[`${productId}_${warehouseId}`] = qty;
                });
                setStockMap(map);
            } catch (err) {
                setError(getFriendlyErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => PaymentService.clearEditModePayments();
    }, [receiptId, updateEditPayments]);

    const fakeReceipt = receipt ? {
        ...receipt,
        items: editItems,
        payments: editPayments,
    } : null;

    // --- Item handlers (local state only, no backend calls) ---

    const handleRemoveItem = useCallback((receiptItemId) => {
        setEditItems(prev => {
            const item = prev.find(i => i.receiptItemId === receiptItemId);
            removedItemRef.current = item || null;
            return prev.filter(i => i.receiptItemId !== receiptItemId);
        });
        return Promise.resolve();
    }, []);

    // Called by OpenedReceiptCard after handleMoveToWarehouse (remove + re-add pattern)
    const handleAddProduct = useCallback((product, warehouseId, quantity = 1) => {
        const productId = product.id || product;
        const stashed = removedItemRef.current;
        removedItemRef.current = null;

        if (stashed && stashed.productId === productId) {
            const warehouseName = warehouses.find(w => w.id === warehouseId)?.name || '';
            setEditItems(prev => [...prev, {
                ...stashed,
                warehouseId,
                warehouseName,
            }]);
        }
        // If no stashed item: user selected a new product → ignored in edit mode
    }, [warehouses]);

    // --- Payment handlers (local state + PaymentService sync, no backend calls) ---

    const handleAddPayment = useCallback(async (methodId, amount, changeDue, warehouseId) => {
        const method = paymentMethods.find(m => m.id === methodId);
        const warehouse = warehouseId ? warehouses.find(w => w.id === warehouseId) : null;
        const newPayment = {
            id: allocateFakeId(),
            paymentMethodLabel: method?.label || '',
            methodCode: method?.code || '',
            warehouseId: warehouseId || null,
            warehouseName: warehouse?.name || null,
            amount: parseFloat(parseFloat(amount).toFixed(2)),
        };
        updateEditPayments([...editPaymentsRef.current, newPayment]);
    }, [paymentMethods, warehouses, updateEditPayments]);

    const handleRemovePayment = useCallback(async (paymentId) => {
        const target = editPaymentsRef.current.find(p => p.id === paymentId);
        if (target?.autoCarried) return; // voucher-ul auto-transferat nu poate fi șters
        updateEditPayments(editPaymentsRef.current.filter(p => p.id !== paymentId));
    }, [updateEditPayments]);

    const handleApplyVoucher = useCallback(async (voucherCode, distributions) => {
        const newVouchers = (distributions || []).map(d => {
            const warehouse = d.warehouseId ? warehouses.find(w => w.id === d.warehouseId) : null;
            return {
                id: allocateFakeId(),
                paymentMethodLabel: 'Voucher',
                methodCode: 'VOUCHER',
                warehouseId: d.warehouseId || null,
                warehouseName: warehouse?.name || null,
                amount: parseFloat(parseFloat(d.amount).toFixed(2)),
                voucherCode,
            };
        });
        updateEditPayments([...editPaymentsRef.current, ...newVouchers]);
    }, [warehouses, updateEditPayments]);

    const handleCloseReceipt = useCallback(async () => {
        setSaving(true);
        try {
            await SalesService.editReceipt(receiptId, {
                items: editItems.map(i => ({
                    receiptItemId: i.receiptItemId,
                    newWarehouseId: i.warehouseId,
                })),
                // VOUCHER se auto-transferă pe backend — nu-l trimitem în request.
                payments: editPaymentsRef.current
                    .filter(p => p.methodCode !== 'VOUCHER')
                    .map(p => ({
                        methodCode: p.methodCode,
                        amount: p.amount,
                        warehouseId: p.warehouseId || null,
                    })),
            });
            PaymentService.clearEditModePayments();
            setSnackbar({ open: true, message: 'Bon corectat cu succes!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: getFriendlyErrorMessage(err), severity: 'error' });
            setSaving(false);
        }
    }, [receiptId, editItems]);

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
        </Box>
    );

    if (error) return (
        <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: 800, mx: 'auto' }}>
            <OpenedReceiptCard
                receipt={fakeReceipt}
                warehouses={warehouses}
                onBack={() => navigate(-1)}
                onAddPayment={() => setPaymentModalOpen(true)}
                onAddProduct={handleAddProduct}
                onRemoveItem={handleRemoveItem}
                onCancelReceipt={() => navigate(-1)}
                editMode
                stockMap={stockMap}
            />

            {fakeReceipt && (
                <AddPaymentModal
                    open={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    receipt={fakeReceipt}
                    paymentMethods={paymentMethods}
                    onAddPayment={handleAddPayment}
                    onApplyVoucher={handleApplyVoucher}
                    onRemovePayment={handleRemovePayment}
                    onCloseReceipt={handleCloseReceipt}
                    loading={saving}
                    closeLabel="CORECTEAZĂ BON"
                />
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={snackbar.severity === 'success' ? 2000 : 4000}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    setSnackbar(s => ({ ...s, open: false }));
                    if (snackbar.severity === 'success') navigate('/admin/sales?tab=0');
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%', fontSize: '1rem', fontWeight: 'bold' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EditReceiptPage;
