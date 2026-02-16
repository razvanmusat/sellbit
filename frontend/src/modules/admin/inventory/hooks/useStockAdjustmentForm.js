import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AdjustmentReasonService } from '../api/AdjustmentReasonService';
import { StockAdjustmentService } from '../api/StockAdjustmentService';
import { StockCurrentService } from '../../../../modules/cashier/sales/api/StockCurrentService'; // IMPORTĂM SERVICIUL DE STOC

export const useStockAdjustmentForm = (warehouseId) => {
    const { user } = useSelector(state => state.auth);

    // --- STATE ---
    const [reasons, setReasons] = useState([]);
    
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentStock, setCurrentStock] = useState(0); // STATE SEPARAT PENTRU STOC
    
    const [selectedReasonId, setSelectedReasonId] = useState('');
    const [quantity, setQuantity] = useState(0); 
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // 1. Încărcare motive
    useEffect(() => {
        let isMounted = true;
        AdjustmentReasonService.getActiveReasons()
            .then(data => { if (isMounted) setReasons(data || []); })
            .catch(err => console.error(err));
        return () => { isMounted = false; };
    }, []);

    // 2. Fetch Stoc Real la Selecție
    useEffect(() => {
        if (selectedProduct && warehouseId) {
            // Dacă produsul nu urmărește stocul, e infinit/0
            if (selectedProduct.trackStock === false) {
                setCurrentStock(0);
                return;
            }

            // Luăm stocul live
            StockCurrentService.getProductStockLive(warehouseId, selectedProduct.id)
                .then(qty => setCurrentStock(Number(qty)))
                .catch(err => {
                    console.error("Eroare la citirea stocului", err);
                    setCurrentStock(0);
                });
        } else {
            setCurrentStock(0);
        }
    }, [selectedProduct, warehouseId]);

    // 3. Calcul Stoc Nou
    const newStock = useMemo(() => {
        return currentStock + Number(quantity);
    }, [currentStock, quantity]);

    // 4. Handlers
    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setQuantity(0); 
    };

    const handleClearSelection = () => {
        setSelectedProduct(null);
        setQuantity(0);
        setNote('');
        setCurrentStock(0);
    };

    const handleIncrement = () => setQuantity(prev => Number(prev) + 1);
    const handleDecrement = () => setQuantity(prev => Number(prev) - 1);

    const handleSubmit = async () => {
        if (!selectedProduct) return;
        if (Number(quantity) === 0) {
            setSnackbar({ open: true, message: "Cantitatea de ajustat este 0.", severity: 'warning' });
            return;
        }
        if (!selectedReasonId) {
            setSnackbar({ open: true, message: "Selectează motivul.", severity: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                productId: selectedProduct.id,
                warehouseId: Number(warehouseId),
                userId: user.id,
                reasonId: Number(selectedReasonId),
                quantityChange: Number(quantity),
                note: note || ''
            };

            await StockAdjustmentService.createAdjustment(payload);
            setSnackbar({ open: true, message: "Stoc actualizat!", severity: 'success' });
            
            // Facem refresh la stocul curent după ajustare (UX bun)
            // SAU dăm clear, cum preferi. Aici dau clear conform flow-ului anterior.
            handleClearSelection();
        } catch (error) {
            setSnackbar({ open: true, message: error.message || "Eroare.", severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    return {
        reasons,
        selectedProduct,
        selectedReasonId, setSelectedReasonId,
        quantity, setQuantity,
        note, setNote,
        loading,
        snackbar,
        currentStock, // Returnăm state-ul calculat asincron
        newStock,
        handleProductSelect,
        handleClearSelection,
        handleIncrement,
        handleDecrement,
        handleSubmit,
        handleCloseSnackbar
    };
};