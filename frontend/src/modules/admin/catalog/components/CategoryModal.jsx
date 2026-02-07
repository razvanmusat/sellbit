import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
    Button, TextField, Box, Typography, Alert, Snackbar 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';

import { CategoryBrowserService } from '../../../../shared/api/CategoryBrowserService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const SYSTEM_CODES = ['REGULAR', 'SERVICE', 'CATERING', 'MENU', 'ADVANCE'];

const CategoryModal = ({ open, onClose, categoryToEdit, parentId, onSuccess }) => {
    const isEditMode = !!categoryToEdit;

    // --- STATE FORMULAR ---
    const [code, setCode] = useState('');
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);

    // --- STATE CONFIRMARE (MUI DIALOG) ---
    const [confirmOpen, setConfirmOpen] = useState(false);

    // --- STATE SNACKBAR (Erori/Succes) ---
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Verificăm dacă e categorie de sistem
    const isSystemCategory = isEditMode && categoryToEdit && SYSTEM_CODES.includes(categoryToEdit.code);
    
    // Calculăm statusul curent pentru UI
    const currentIsActive = categoryToEdit?.isActive !== undefined 
                            ? categoryToEdit.isActive 
                            : (categoryToEdit?.active !== undefined ? categoryToEdit.active : true);

    useEffect(() => {
        if (open) {
            if (categoryToEdit) {
                // Edit Mode
                setCode(categoryToEdit.code || '');
                setLabel(categoryToEdit.label || '');
            } else {
                // Create Mode
                setCode(''); 
                setLabel('');
            }
            setLoading(false);
            setConfirmOpen(false);
        }
    }, [open, categoryToEdit]);

    // --- HANDLERS ---

    const showSnackbar = (message, severity = 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!code || code.trim().length < 2) {
            showSnackbar("Codul este obligatoriu (min 2 caractere).", "error");
            return;
        }
        if (!label || label.trim().length < 3) {
            showSnackbar("Denumirea este obligatorie (min 3 caractere).", "error");
            return;
        }

        setLoading(true);
        try {
            if (isEditMode) {
                await CategoryBrowserService.updateCategory(categoryToEdit.id, {
                    id: categoryToEdit.id,
                    code: code,
                    label: label,
                    parentId: categoryToEdit.parentId,
                    isActive: currentIsActive // Păstrăm statusul curent
                });
                onSuccess("Categoria a fost actualizată!");
                onClose();
            } else {
                await CategoryBrowserService.createCategory({
                    code: code,
                    label: label,
                    parentId: parentId || null,
                    isActive: true // Implicit activă la creare
                });
                onSuccess("Categoria a fost creată!");
                onClose();
            }
        } catch (err) {
            console.error("Save Error:", err);
            showSnackbar(getFriendlyErrorMessage(err), "error");
        } finally {
            setLoading(false);
        }
    };

    // 1. Deschide fereastra de confirmare MUI
    const handleOpenConfirm = () => {
        if (isSystemCategory) {
            showSnackbar("Nu puteți dezactiva o categorie de sistem!", "warning");
            return;
        }
        setConfirmOpen(true);
    };

    // 2. Execută acțiunea după confirmare
    const handleConfirmToggle = async () => {
        setConfirmOpen(false); // Închidem confirmarea
        setLoading(true);

        const targetStatus = !currentIsActive;

        try {
            await CategoryBrowserService.toggleStatus(categoryToEdit.id, targetStatus);
            onSuccess(currentIsActive ? "Categoria a fost dezactivată." : "Categoria a fost reactivată.");
            onClose();
        } catch (err) {
            console.error("Toggle Error:", err);
            showSnackbar(getFriendlyErrorMessage(err), "error");
            setLoading(false); // Oprim loading doar pe eroare, pe succes se închide modala oricum
        }
    };

    return (
        <>
            {/* --- MODALA PRINCIPALĂ --- */}
            <Dialog 
                open={open} 
                onClose={onClose} 
                fullWidth 
                maxWidth="sm"
                disableRestoreFocus={false} 
            >
                <DialogTitle>
                    {isEditMode ? `Editare: ${categoryToEdit.label}` : 'Categorie Nouă'}
                    {isEditMode && (
                        <Typography variant="caption" display="block" color={currentIsActive ? "success.main" : "error.main"}>
                            Status: {currentIsActive ? "ACTIV" : "INACTIV"}
                            {isSystemCategory && " (SISTEM)"}
                        </Typography>
                    )}
                </DialogTitle>
                
                <form onSubmit={handleSave}>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} py={1}>
                            
                            {isSystemCategory && (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    Aceasta este o categorie de sistem. Codul nu poate fi modificat.
                                </Alert>
                            )}

                            <TextField 
                                label="Cod Categorie" 
                                fullWidth 
                                required
                                disabled={isSystemCategory || loading}
                                autoFocus={!isSystemCategory}
                                placeholder="Ex: BAUTURI"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                InputProps={{
                                    endAdornment: isSystemCategory ? <LockIcon color="action" /> : null
                                }}
                            />

                            <TextField 
                                label="Denumire (Label)" 
                                fullWidth 
                                required
                                disabled={loading}
                                autoFocus={isSystemCategory}
                                placeholder="Ex: Băuturi Răcoritoare"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                        {isEditMode ? (
                            <Button 
                                variant="outlined" 
                                color={currentIsActive ? "error" : "success"} 
                                startIcon={currentIsActive ? <DeleteIcon /> : <RestoreFromTrashIcon />} 
                                onClick={handleOpenConfirm} // Deschide confirmarea MUI
                                type="button"
                                disabled={isSystemCategory || loading}
                            >
                                {currentIsActive ? "Dezactivează" : "Reactivează"}
                            </Button>
                        ) : (
                            <Box />
                        )}

                        <Box>
                            <Button onClick={onClose} sx={{ mr: 1 }} disabled={loading}>Anulează</Button>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                startIcon={<SaveIcon />}
                                disabled={loading}
                            >
                                {loading ? "Se salvează..." : "Salvează"}
                            </Button>
                        </Box>
                    </DialogActions>
                </form>
            </Dialog>

            {/* --- CONFIRMARE MUI (Separată de alertă) --- */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
            >
                <DialogTitle>Confirmare Acțiune</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sunteți sigur că doriți să {currentIsActive ? "dezactivați" : "reactivați"} categoria <strong>{label}</strong>?
                        {currentIsActive && " Aceasta nu va mai fi vizibilă în POS."}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} color="primary">
                        Nu, Anulează
                    </Button>
                    <Button onClick={handleConfirmToggle} color="error" variant="contained" autoFocus>
                        Da, {currentIsActive ? "Dezactivează" : "Reactivează"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- SNACKBAR LOCAL PENTRU ERORI MODALĂ --- */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default CategoryModal;