import { useState, useEffect } from 'react';
// Asigură-te că importul este corect (CategoryBrowserService sau CategoryService)
import { CategoryBrowserService } from '../../../../shared/api/CategoryBrowserService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const SYSTEM_CODES = ['REGULAR', 'SERVICE', 'CATERING', 'MENU', 'ADVANCE'];

export const useCategoryModal = (open, onClose, categoryToEdit, parentId, onSuccess) => {
    const isEditMode = !!categoryToEdit;
    
    // --- STATE ---
    const [code, setCode] = useState('');
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    
    // Snackbar state
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // --- LOGICĂ DERIVATĂ ---
    const isSystemCategory = isEditMode && categoryToEdit && SYSTEM_CODES.includes(categoryToEdit.code);
    
    // Normalizare isActive (pentru cazuri unde vine null sau undefined)
    const currentIsActive = categoryToEdit?.isActive ?? true;

    // --- EFECTE: Resetare Formular ---
    useEffect(() => {
        if (open) {
            // 1. Populăm datele
            if (categoryToEdit) {
                setCode(categoryToEdit.code || '');
                setLabel(categoryToEdit.label || '');
            } else {
                setCode(''); 
                setLabel('');
            }

            // 2. Resetăm stările UI
            setLoading(false);
            setConfirmOpen(false);

            // FIX CRITIC: Resetăm orice eroare veche rămasă în memorie!
            setSnackbar({ open: false, message: '', severity: 'success' });
        }
    }, [open, categoryToEdit]);

    // --- HELPERS ---
    const showSnackbar = (message, severity = 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // --- ACTIONS ---

    // 1. Logica de verificare înainte de a deschide modala de confirmare
    const handleAttemptToggle = () => {
        if (isSystemCategory) {
            showSnackbar("Nu puteți dezactiva o categorie de sistem!", "warning");
            return;
        }
        setConfirmOpen(true);
    };

    // 2. Salvare (Create / Update)
    const handleSave = async (e) => {
        if (e) e.preventDefault();

        // Validări Frontend simple
        if (!code || code.trim().length < 2) {
            showSnackbar("Codul este obligatoriu (min 2 caractere).", "warning");
            return;
        }
        if (!label || label.trim().length < 3) {
            showSnackbar("Denumirea este obligatorie (min 3 caractere).", "warning");
            return;
        }

        setLoading(true);
        try {
            if (isEditMode) {
                await CategoryBrowserService.updateCategory(categoryToEdit.id, {
                    id: categoryToEdit.id,
                    code,
                    label,
                    parentId: categoryToEdit.parentId,
                    isActive: currentIsActive
                });
                onSuccess("Categoria a fost actualizată!");
            } else {
                await CategoryBrowserService.createCategory({
                    code,
                    label,
                    parentId: parentId || null,
                    isActive: true
                });
                onSuccess("Categoria a fost creată!");
            }
            onClose();
        } catch (err) {            
            showSnackbar(getFriendlyErrorMessage(err), "error");
        } finally {
            setLoading(false);
        }
    };

    // 3. Toggle Status (Confirmare finală)
    const handleConfirmToggle = async () => {
        setConfirmOpen(false);
        setLoading(true);
        try {
            await CategoryBrowserService.toggleStatus(categoryToEdit.id, !currentIsActive);
            onSuccess(currentIsActive ? "Categoria a fost dezactivată." : "Categoria a fost reactivată.", { refreshMenus: true });
            onClose();
        } catch (err) {
            showSnackbar(getFriendlyErrorMessage(err), "error");
            setLoading(false);
        }
    };

    return {
        state: {
            code,
            label,
            loading,
            confirmOpen,
            snackbar,
            isEditMode,
            isSystemCategory,
            currentIsActive
        },
        setters: {
            setCode,
            setLabel,
            setConfirmOpen,
            setSnackbar
        },
        handlers: {
            handleSave,
            handleAttemptToggle,
            handleConfirmToggle,
            handleCloseSnackbar,
            showSnackbar
        }
    };
};