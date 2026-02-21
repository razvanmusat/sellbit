import { useState, useEffect } from 'react';
import { ProductService } from '../api/ProductService';
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

    const normalizeId = (value) => {
        if (value === '' || value == null) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const isMenuTypeId = (typeId) => {
        const normalizedTypeId = normalizeId(typeId);
        return types.some(t => normalizeId(t.id) === normalizedTypeId && t.code === 'MENU');
    };

    const editedProductIsMenu = productToEdit?.productTypeCode === 'MENU' || isMenuTypeId(productToEdit?.productTypeId);

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

        const normalizedProductTypeId = normalizeId(productTypeId);
        const normalizedUnitId = normalizeId(unitId);
        const normalizedVatRateId = normalizeId(vatRateId);
        const normalizedCategoryId = normalizeId(isEditMode ? productToEdit.categoryId : categoryId);
        const normalizedSalePrice = salePrice === '' ? null : parseFloat(salePrice);
        const normalizedPurchasePrice = purchasePrice === '' ? null : parseFloat(purchasePrice);

        if (!name || !name.trim()) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.PRODUCT.NAME_REQUIRED'));
        }

        if (!normalizedCategoryId) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.CATEGORY.REQUIRED'));
        }

        if (!normalizedProductTypeId) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.PRODUCT_TYPE.REQUIRED'));
        }

        if (!normalizedUnitId) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.UNIT.REQUIRED'));
        }

        // VALIDARE: Folosim cheia din dicționar, nu text hardcodat!
        if (!normalizedVatRateId) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.VAT.REQUIRED'));
        }

        if (normalizedSalePrice == null || Number.isNaN(normalizedSalePrice) || normalizedSalePrice < 0) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.PRICE.INVALID'));
        }

        const selectedType = types.find(t => normalizeId(t.id) === normalizedProductTypeId);
        const isCateringType = selectedType?.code === 'CATERING';
        if (isCateringType && (normalizedPurchasePrice == null || Number.isNaN(normalizedPurchasePrice) || normalizedPurchasePrice <= 0)) {
            return showSnackbar(getFriendlyErrorMessage('ERROR.CATERING.PRICE_REQUIRED'));
        }

        const payload = {
            name: name.trim(),
            barcode: barcode ? barcode.trim() : null,
            categoryId: normalizedCategoryId,
            productTypeId: normalizedProductTypeId,
            unitId: normalizedUnitId,
            vatRateId: normalizedVatRateId,
            salePrice: normalizedSalePrice,
            purchasePrice: normalizedPurchasePrice,
            isActive: isEditMode ? currentIsActive : true
        };

        setLoading(true);
        try {
            if (isEditMode) {
                await ProductService.update(productToEdit.id, payload);
                const affectsMenus = isMenuTypeId(payload.productTypeId) || editedProductIsMenu;
                onSuccess("Produs actualizat!", { refreshMenus: affectsMenus });
            } else {
                await ProductService.create(payload);
                onSuccess("Produs creat!", { refreshMenus: isMenuTypeId(payload.productTypeId) });
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
            onSuccess(currentIsActive ? "Produs dezactivat." : "Produs reactivat.", { refreshMenus: editedProductIsMenu });
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
            onSuccess("Produs mutat!", { refreshMenus: editedProductIsMenu });
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