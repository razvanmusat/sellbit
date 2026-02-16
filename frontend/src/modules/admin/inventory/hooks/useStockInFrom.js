import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux'; 
import { PurchaseService } from '../api/PurchaseService';
import { fetchPurchaseReport } from '../store/purchasePageSlice';

export const useStockInForm = (warehouseId) => {
    const dispatch = useDispatch();    
    
    const { user } = useSelector((state) => state.auth);
    const { startDate, endDate } = useSelector((state) => state.purchasePage); 

    const STORAGE_KEY = `inventory_draft_${warehouseId}`;

    // --- STATE ---
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [expirationDate, setExpirationDate] = useState(null);

    const [globalNote, setGlobalNote] = useState('');
    const [pendingItems, setPendingItems] = useState([]);
    
    // Feedback
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // --- 1. LOAD FROM STORAGE (Mount) ---
    useEffect(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.items) setPendingItems(parsed.items);
                if (parsed.note) setGlobalNote(parsed.note);
            } catch (e) {
                console.error("Eroare la citirea draft-ului", e);
            }
        }
    }, [warehouseId, STORAGE_KEY]);

    // --- 2. SAVE TO STORAGE (Update) ---
    useEffect(() => {
        const dataToSave = { items: pendingItems, note: globalNote };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, [pendingItems, globalNote, STORAGE_KEY]);

    // --- HANDLERS ---

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        // Resetăm input-urile liniei curente
        setQuantity('');
        setPurchasePrice('');
        setExpirationDate(null);
    };

    const handleClearSelection = () => {
        setSelectedProduct(null);
        setQuantity('');
        setPurchasePrice('');
        setExpirationDate(null);
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;

        const qtyVal = parseFloat(quantity);
        const priceVal = parseFloat(purchasePrice);

        // Validări
        if (!qtyVal || qtyVal <= 0) {
            setSnackbar({ open: true, message: "Cantitatea trebuie să fie pozitivă.", severity: 'warning' });
            return;
        }
        if (isNaN(priceVal) || priceVal < 0) {
            setSnackbar({ open: true, message: "Prețul nu poate fi negativ.", severity: 'warning' });
            return;
        }

        const newItem = {
            uniqueId: Date.now(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            quantity: qtyVal,
            purchasePrice: priceVal,
            expirationDate: expirationDate ? expirationDate.format('YYYY-MM-DD') : null,
        };

        setPendingItems(prev => [...prev, newItem]);
        handleClearSelection(); // Reset pt următorul
    };

    const handleRemoveItem = (uniqueId) => {
        setPendingItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
    };

    const handleSavePurchase = async () => {
        if (pendingItems.length === 0) return;

        const payload = {
            userId: user?.id,
            globalNote: globalNote,
            items: pendingItems.map(item => ({
                productId: item.productId,
                warehouseId: Number(warehouseId),
                quantity: item.quantity,
                purchasePrice: item.purchasePrice,
                expirationDate: item.expirationDate
            }))
        };

        try {
            // 1. Salvare în Backend
            await PurchaseService.addBulkPurchase(payload);
            setSnackbar({ open: true, message: "Recepție salvată cu succes!", severity: 'success' });
            
            // 2. TRIGGER REFRESH (Actualizăm Jurnalul)
            if (warehouseId) {
                dispatch(fetchPurchaseReport({ 
                    startDate, 
                    endDate, 
                    warehouseId 
                }));
            }

            // 3. Reset complet
            setPendingItems([]);
            setGlobalNote('');
            setSelectedProduct(null);
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error(error);
            const msg = error.message || "Eroare la salvare.";
            setSnackbar({ open: true, message: msg, severity: 'error' });
        }
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    // Calcul Total
    const totalValue = useMemo(() => 
        pendingItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0), 
    [pendingItems]);

    return {
        // State
        selectedProduct,
        quantity, setQuantity,
        purchasePrice, setPurchasePrice,
        expirationDate, setExpirationDate,
        globalNote, setGlobalNote,
        pendingItems,
        snackbar,
        totalValue,

        // Handlers
        handleProductSelect,
        handleClearSelection,
        handleAddItem,
        handleRemoveItem,
        handleSavePurchase,
        handleCloseSnackbar
    };
};