import { useState, useEffect } from 'react';
import { ProductCompositeService } from '../api/ProductCompositeService';
import { SalesService } from '../../../cashier/sales/api/SalesService';
import { WarehouseService } from '../../../cashier/sales/api/WarehouseService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useProductCompositeConfig = (open, parentProduct, onClose) => {
    // --- STATE ---
    const [loading, setLoading] = useState(false);
    const [components, setComponents] = useState([]);
    
    // Stare blocare (Persistentă - rămâne Alert inline)
    const [isLocked, setIsLocked] = useState(false);
    const [lockReason, setLockReason] = useState('');

    // Stare erori/succes (Tranzitorie - Snackbar)
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // --- EFFECT: LOAD & CHECK ---
    useEffect(() => {
        if (open && parentProduct) {
            loadComposition(parentProduct.id);
            checkOpenReceipts();
        }
    }, [open, parentProduct]);

    // --- HELPER SNACKBAR ---
    const showSnackbar = (message, severity = 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // --- LOGIC: CHECK OPEN RECEIPTS ---
    const checkOpenReceipts = async () => {
        try {
            const warehouses = await WarehouseService.getActiveWarehouses(); 
            for (const w of warehouses) {
                const receipts = await SalesService.getActiveReceipts(w.id);
                if (receipts && receipts.length > 0) {
                    setIsLocked(true);
                    // Mesaj specific de business, poate rămâne hardcodat sau pus în dicționar dacă e folosit des
                    setLockReason(`ATENȚIE: Există bonuri deschise în gestiunea "${w.name}". Nu poți modifica rețete în timpul programului!`);
                    return; 
                }
            }
            setIsLocked(false);
            setLockReason('');
        } catch (error) {
            // Aici folosim dicționarul pentru erori de rețea/backend
            showSnackbar(getFriendlyErrorMessage(error));
        }
    };

    // --- LOGIC: LOAD COMPOSITION ---
    const loadComposition = async (parentId) => {
        setLoading(true);
        try {
            const data = await ProductCompositeService.getActiveComponents(parentId);
            const sanitized = (data || []).map(c => ({
                ...c,
                quantity: parseFloat(c.quantity) || 1
            }));
            setComponents(sanitized);
        } catch (error) {
            showSnackbar(getFriendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS: UI INTERACTIONS ---
    const handleIngredientSelected = (product) => {
        if (isLocked) return; 

        // Validări locale
        if (components.find(c => c.childProductId === product.id)) {
            showSnackbar(`Produsul "${product.name}" este deja în listă.`, 'warning');
            return;
        }
        if (product.id === parentProduct.id) {
            // Folosim cheia din dicționar pentru self-reference
            showSnackbar(getFriendlyErrorMessage("ERROR.COMPOSITE.SELF_REFERENCE"), 'warning');
            return;
        }

        const newComp = {
            childProductId: product.id,
            childProductName: product.name,
            quantity: 1, 
            unitLabel: product.unit?.label || 'buc'
        };
        setComponents(prev => [...prev, newComp]);
    };

    const handleIncrement = (index) => {
        if (isLocked) return;
        const list = [...components];
        list[index].quantity = (list[index].quantity || 0) + 1;
        setComponents(list);
    };

    const handleDecrement = (index) => {
        if (isLocked) return;
        const list = [...components];
        const currentQty = list[index].quantity || 0;

        if (currentQty <= 1) {
            list.splice(index, 1);
        } else {
            list[index].quantity = currentQty - 1;
        }
        setComponents(list);
    };

    // --- LOGIC: SAVE ---
    const handleSave = async () => {
        if (isLocked) {
            showSnackbar("Modificarea este blocată!", 'error');
            return;
        }

        setLoading(true);
        try {
            const request = {
                parentProductId: parentProduct.id,
                components: components.map(c => ({
                    childProductId: c.childProductId,
                    quantity: parseFloat(c.quantity)
                }))
            };
            await ProductCompositeService.updateComposition(request);
            
            // Succes -> închidem modala
            onClose(true); 
        } catch (error) {
            // Eroare Backend (Validare DTO sau Logică) -> Dicționar
            showSnackbar(getFriendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return {
        state: {
            loading,
            components,
            isLocked,
            lockReason,
            snackbar
        },
        handlers: {
            handleIngredientSelected,
            handleIncrement,
            handleDecrement,
            handleSave,
            closeSnackbar
        }
    };
};