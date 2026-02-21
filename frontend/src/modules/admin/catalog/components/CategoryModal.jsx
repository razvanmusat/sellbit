import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
    Button, TextField, Box, Typography, Alert, Snackbar, IconButton 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';

import { useCategoryModal } from '../hooks/useCategoryModal';

const CategoryModal = ({ open, onClose, categoryToEdit, parentId, onSuccess }) => {
    const { state, setters, handlers } = useCategoryModal(open, onClose, categoryToEdit, parentId, onSuccess);

    if (!open) return null;

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        {state.isEditMode ? `Editare: ${state.label}` : 'Categorie Nouă'}
                        {state.isEditMode && (
                            <Typography variant="caption" display="block" color={state.currentIsActive ? "success.main" : "error.main"}>
                                Status: {state.currentIsActive ? "ACTIV" : "INACTIV"}
                                {state.isSystemCategory && " (SISTEM)"}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </DialogTitle>
                
                <form onSubmit={handlers.handleSave}>
                    <DialogContent dividers>
                        <Box display="flex" flexDirection="column" gap={2}>
                            {state.isSystemCategory && (
                                <Alert severity="info">
                                    Aceasta este o categorie de sistem. Codul nu poate fi modificat.
                                </Alert>
                            )}

                            <TextField 
                                label="Cod Categorie" 
                                fullWidth required
                                disabled={state.isSystemCategory || state.loading}
                                autoFocus={!state.isSystemCategory}
                                value={state.code}
                                onChange={(e) => setters.setCode(e.target.value.toUpperCase())}    
                                // FIX: Folosim InputProps standard pentru TextField simplu
                                slotProps={{
                                    input: {
                                        endAdornment: state.isSystemCategory ? <LockIcon color="action" /> : null
                                    }
                                }}
                            />

                            <TextField 
                                label="Denumire (Label)" 
                                fullWidth required
                                disabled={state.loading}
                                autoFocus={state.isSystemCategory}
                                value={state.label}
                                onChange={(e) => setters.setLabel(e.target.value)}
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                        {state.isEditMode ? (
                            <Button 
                                variant="outlined" 
                                color={state.currentIsActive ? "error" : "success"} 
                                startIcon={state.currentIsActive ? <DeleteIcon /> : <RestoreFromTrashIcon />} 
                                // FIX: Am mutat logica de verificare în handler-ul din hook (handleAttemptToggle)
                                onClick={handlers.handleAttemptToggle}
                                disabled={state.loading}
                            >
                                {state.currentIsActive ? "Dezactivează" : "Reactivează"}
                            </Button>
                        ) : <Box />}

                        <Box>
                            <Button onClick={onClose} sx={{ mr: 1 }} disabled={state.loading}>Anulează</Button>
                            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={state.loading}>
                                {state.loading ? "Se salvează..." : "Salvează"}
                            </Button>
                        </Box>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Confirmare Status */}
            <Dialog open={state.confirmOpen} onClose={() => setters.setConfirmOpen(false)}>
                <DialogTitle>Confirmare Acțiune</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sunteți sigur că doriți să {state.currentIsActive ? "dezactivați" : "reactivați"} categoria <strong>{state.label}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setters.setConfirmOpen(false)}>Nu, Anulează</Button>
                    <Button onClick={handlers.handleConfirmToggle} color="error" variant="contained" autoFocus>
                        Da, Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar Local */}
            <Snackbar 
                open={state.snackbar.open} 
                autoHideDuration={4000} 
                onClose={handlers.closeSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={state.snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {state.snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default CategoryModal;