import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
    Button, TextField, Box, Typography, MenuItem, InputAdornment, 
    Snackbar, Alert, Autocomplete, CircularProgress, IconButton 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import InventoryIcon from '@mui/icons-material/Inventory'; 
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'; 
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import CloseIcon from '@mui/icons-material/Close';

import { useProductModal } from '../hooks/useProductModal';

const ProductModal = ({ open, onClose, productToEdit, categoryId, onSuccess }) => {
    const { state, setters, handlers } = useProductModal(open, onClose, productToEdit, categoryId, onSuccess);

    const selectedTypeObj = state.types.find(t => t.id === state.productTypeId);
    const isCatering = selectedTypeObj?.code === 'CATERING';
    const isRegular = selectedTypeObj?.code === 'REGULAR';

    // Dacă modala principală nu e deschisă, nu randăm nimic pentru a evita ID-uri orfane în DOM
    if (!open) return null;

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                fullWidth 
                maxWidth="sm" 
                disableEnforceFocus
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        {state.isEditMode ? `Editare: ${state.name}` : 'Produs Nou'}
                    </Box>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </DialogTitle>
                
                <form onSubmit={handlers.handleSave} noValidate autoComplete="off">
                    <DialogContent dividers>
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField 
                                label="Nume Produs" fullWidth required 
                                autoComplete="off"
                                value={state.name} onChange={e => setters.setName(e.target.value)} 
                            />
                            
                            <TextField 
                                label="Cod de Bare" fullWidth 
                                autoComplete="off"
                                value={state.barcode} onChange={e => setters.setBarcode(e.target.value)} 
                            />
                            
                            <TextField 
                                label="Preț Vânzare" type="number" fullWidth required
                                autoComplete="off"
                                slotProps={{ input: { endAdornment: <InputAdornment position="end">RON</InputAdornment> } }}
                                value={state.salePrice} onChange={e => setters.setSalePrice(e.target.value)}
                            />

                            <TextField 
                                select label="Tip Produs" fullWidth required
                                value={state.types.length > 0 ? state.productTypeId : ''} 
                                onChange={e => setters.setProductTypeId(e.target.value)}
                            >
                                {state.types.map(t => <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>)}
                            </TextField>
                            
                            {state.productTypeId && (
                                <Alert icon={isRegular ? <InventoryIcon /> : <DoNotDisturbIcon />} severity={isRegular ? "success" : "info"}>
                                    {isRegular ? "Produs cu stoc." : "Fără stoc."}
                                </Alert>
                            )}

                            {isCatering && (
                                <TextField 
                                    label="Preț Achiziție" type="number" fullWidth
                                    autoComplete="off"
                                    slotProps={{ input: { endAdornment: <InputAdornment position="end">RON</InputAdornment> } }}
                                    value={state.purchasePrice} onChange={e => setters.setPurchasePrice(e.target.value)}
                                />
                            )}

                            <TextField 
                                select label="Unitate Măsură" fullWidth required
                                value={state.units.length > 0 ? state.unitId : ''} 
                                onChange={e => setters.setUnitId(e.target.value)}
                            >
                                {state.units.map(u => <MenuItem key={u.id} value={u.id}>{u.symbol} {u.label}</MenuItem>)}
                            </TextField>

                            <TextField
                                select label="Cotă TVA" fullWidth required
                                value={state.vatRates.length > 0 ? state.vatRateId : ''}
                                onChange={e => setters.setVatRateId(e.target.value)}
                            >
                                {state.vatRates.map(v => <MenuItem key={v.id} value={v.id}>{v.label}</MenuItem>)}
                            </TextField>

                            <TextField
                                select label="Gestiune Fixă (opțional)" fullWidth
                                value={state.warehouses.length > 0 ? state.forcedWarehouseId : ''}
                                onChange={e => setters.setForcedWarehouseId(e.target.value)}
                            >
                                <MenuItem value=""><em>Niciuna (folosește gestiunea bonului)</em></MenuItem>
                                {state.warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                            </TextField>
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
                         {state.isEditMode ? (
                            <Box display="flex" gap={1}>
                                <Button variant="outlined" color={state.currentIsActive ? "error" : "success"} startIcon={state.currentIsActive ? <DeleteIcon /> : <RestoreFromTrashIcon />} onClick={() => setters.setConfirmOpen(true)}>
                                    {state.currentIsActive ? "Dezactivează" : "Reactivează"}
                                </Button>
                                <Button variant="outlined" color="secondary" startIcon={<DriveFileMoveIcon />} onClick={handlers.handleOpenMoveDialog}>Mută</Button>
                            </Box>
                        ) : <Box />}

                        <Box>
                            <Button onClick={onClose} sx={{ mr: 1 }}>Anulează</Button>
                            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={state.loading}>
                                {state.loading ? "Salvare..." : "Salvează"}
                            </Button>
                        </Box>
                    </DialogActions>
                </form>
            </Dialog>

            {/* MODALA DE MUTARE - Randată condiționat pentru a evita conflictele de focus/ARIA */}
            {state.moveDialogOpen && (
                <Dialog open={true} onClose={() => setters.setMoveDialogOpen(false)} fullWidth maxWidth="xs" disableEnforceFocus>
                    <DialogTitle>Mută Produsul</DialogTitle>
                    <DialogContent dividers>
                        {state.loadingLeaves ? <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box> : (
                            <Autocomplete
                                options={state.leafCategories}
                                getOptionLabel={(option) => option.label || ""}
                                isOptionEqualToValue={(option, value) => option.id === value?.id}
                                onChange={(e, val) => setters.setSelectedMoveCategory(val)}
                                renderInput={(params) => <TextField {...params} label="Noua Categorie" variant="outlined" sx={{ mt: 1 }} />}
                            />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setters.setMoveDialogOpen(false)}>Anulează</Button>
                        <Button onClick={handlers.handleMoveProduct} variant="contained" color="warning" disabled={!state.selectedMoveCategory}>Confirmă</Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* CONFIRMARE STATUS */}
            {state.confirmOpen && (
                <Dialog open={true} onClose={() => setters.setConfirmOpen(false)} disableEnforceFocus>
                    <DialogTitle>Confirmare</DialogTitle>
                    <DialogContent><DialogContentText>Schimbați statusul pentru <strong>{state.name}</strong>?</DialogContentText></DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setters.setConfirmOpen(false)}>Nu</Button>
                        <Button onClick={handlers.handleConfirmToggle} variant="contained" autoFocus>Da, Confirm</Button>
                    </DialogActions>
                </Dialog>
            )}

            <Snackbar 
                open={state.snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setters.setSnackbar({ ...state.snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={state.snackbar.severity} variant="filled" sx={{ width: '100%' }}>{state.snackbar.message}</Alert>
            </Snackbar>
        </>
    );
};

export default ProductModal;