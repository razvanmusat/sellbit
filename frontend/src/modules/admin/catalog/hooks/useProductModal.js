import { useState, useEffect } from 'react';
import { ProductService } from '../api/ProductService';
import { CategoryService } from '../api/CategoryService';
import { LookupService } from '../api/LookupService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useProductModal = (open, onClose, productToEdit, categoryId, onSuccess) => {
    const isEditMode = !!productToEdit;

    // --- FORM STATE ---
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [productTypeId, setProductTypeId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [vatRateId, setVatRateId] = useState('');

    // --- LOOKUP LISTS ---
    const [types, setTypes] = useState([]);
    const [units, setUnits] = useState([]);
    const [vatRates, setVatRates] = useState([]);

    // --- UI STATE ---
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // --- MOVE LOGIC STATE ---
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [leafCategories, setLeafCategories] = useState([]);
    const [selectedMoveCategory, setSelectedMoveCategory] = useState(null);
    const [loadingLeaves, setLoadingLeaves] = useState(false);

    const currentIsActive = productToEdit?.isActive ?? true;

    // 1. Fetch Lookups
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [t, u, v] = await Promise.all([
                    LookupService.getActiveProductTypes(),
                    LookupService.getActiveUnits(),
                    LookupService.getActiveVatRates()
                ]);
                setTypes(t || []);
                setUnits(u || []);
                setVatRates(v || []);
            } catch (err) {
                // Aici putem lăsa console.error, sau putem afișa un snackbar discret
                console.error("Eroare încărcare nomenclatoare:", err);
                // showSnackbar(getFriendlyErrorMessage(err)); // Opțional
            }
        };
        if (open) fetchLookups();
    }, [open]);

    // 2. Populate Form
    useEffect(() => {
        if (open) {
            if (productToEdit) {
                setName(productToEdit.name || '');
                setBarcode(productToEdit.barcode || '');
                setSalePrice(productToEdit.salePrice || '');
                setPurchasePrice(productToEdit.purchasePrice || '');
                setProductTypeId(productToEdit.productTypeId || '');
                setUnitId(productToEdit.unitId || '');
                setVatRateId(productToEdit.vatRateId || '');
            } else {
                setName('');
                setBarcode('');
                setSalePrice('');
                setPurchasePrice('');
                setProductTypeId('');
                setUnitId('');
                setVatRateId('');
            }
            setLoading(false);
            setConfirmOpen(false);
            setMoveDialogOpen(false);
            setSelectedMoveCategory(null);
        }
    }, [open, productToEdit]);

    const showSnackbar = (message, severity = 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        // VALIDARE: Folosim cheia din dicționar, nu text hardcodat!
        if (!vatRateId) {
            return showSnackbar(getFriendlyErrorMessage("ERROR.VAT.REQUIRED"));
        }

        const payload = {
            name,
            barcode: barcode || null,
            categoryId: isEditMode ? productToEdit.categoryId : categoryId,
            productTypeId,
            unitId,
            vatRateId,
            salePrice: salePrice ? parseFloat(salePrice) : 0, // Protecție pt NaN
            purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
            isActive: isEditMode ? currentIsActive : true
        };

        setLoading(true);
        try {
            if (isEditMode) {
                await ProductService.update(productToEdit.id, payload);
                onSuccess("Produs actualizat!");
            } else {
                await ProductService.create(payload);
                onSuccess("Produs creat!");
            }
            onClose();
        } catch (err) {
            // EROARE BACKEND -> DICȚIONAR
            showSnackbar(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmToggle = async () => {
        setConfirmOpen(false);
        setLoading(true);
        try {
            await ProductService.toggleStatus(productToEdit.id, !currentIsActive);
            onSuccess(currentIsActive ? "Produs dezactivat." : "Produs reactivat.");
            onClose();
        } catch (err) {
             // EROARE BACKEND -> DICȚIONAR
            showSnackbar(getFriendlyErrorMessage(err));
            setLoading(false);
        }
    };

    const handleOpenMoveDialog = async () => {
        setMoveDialogOpen(true);
        setLoadingLeaves(true);
        try {
            const leaves = await CategoryService.getLeafCategories();
            setLeafCategories(leaves);
        } catch (err) {
             // EROARE BACKEND -> DICȚIONAR (Era hardcodat înainte)
            showSnackbar(getFriendlyErrorMessage(err));
        } finally {
            setLoadingLeaves(false);
        }
    };

    const handleMoveProduct = async () => {
        if (!selectedMoveCategory) return;
        setMoveDialogOpen(false);
        setLoading(true);
        try {
            await ProductService.move(productToEdit.id, selectedMoveCategory.id);
            onSuccess("Produs mutat!");
            onClose();
        } catch (err) {
             // EROARE BACKEND -> DICȚIONAR
            showSnackbar(getFriendlyErrorMessage(err));
            setLoading(false);
        }
    };

    return {
        state: {
            name, barcode, salePrice, purchasePrice, productTypeId, unitId, vatRateId,
            types, units, vatRates, loading, confirmOpen, snackbar, currentIsActive,
            moveDialogOpen, leafCategories, selectedMoveCategory, loadingLeaves, isEditMode
        },
        setters: {
            setName, setBarcode, setSalePrice, setPurchasePrice, setProductTypeId, 
            setUnitId, setVatRateId, setConfirmOpen, setSnackbar, setMoveDialogOpen, setSelectedMoveCategory
        },
        handlers: {
            handleSave, handleConfirmToggle, handleOpenMoveDialog, handleMoveProduct
        }
    };
};