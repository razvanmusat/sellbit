import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, IconButton, Typography, CircularProgress, 
    Alert, Snackbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';      
import RemoveIcon from '@mui/icons-material/Remove'; 

import SimpleProductSearch from './SimpleProductSearch';
import { useProductCompositeConfig } from '../hooks/useProductCompositeConfig';

const ProductCompositeConfigModal = ({ open, onClose, parentProduct }) => {
    // Apelăm hook-ul care conține toată logica
    const { state, handlers } = useProductCompositeConfig(open, parentProduct, onClose);

    return (
        <>
            <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="md">
                <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6">Configurare: {parentProduct?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Adaugă ingredientele din meniu</Typography>
                    </Box>
                    <IconButton onClick={() => onClose(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                
                <DialogContent dividers>
                    {/* ALERTĂ DE BLOCARE (Persistentă - rămâne inline pentru vizibilitate maximă) */}
                    {state.isLocked && (
                        <Alert severity="error" variant="filled" sx={{ mb: 2 }}>
                            {state.lockReason}
                        </Alert>
                    )}

                    <Box mb={2} sx={{ opacity: state.isLocked ? 0.5 : 1, pointerEvents: state.isLocked ? 'none' : 'auto' }}>
                        <SimpleProductSearch onSelect={handlers.handleIngredientSelected} />
                    </Box>

                    {state.loading ? <Box p={2} textAlign="center"><CircularProgress /></Box> : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ bgcolor: 'grey.100' }}>
                                    <TableRow>
                                        <TableCell>Ingredient</TableCell>
                                        <TableCell align="right" width={180}>Cantitate</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {state.components.map((comp, i) => (
                                        <TableRow key={i}>
                                            <TableCell sx={{ verticalAlign: 'middle' }}>
                                                <Typography variant="body1" fontWeight="500">
                                                    {comp.childProductName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {comp.unitLabel}
                                                </Typography>
                                            </TableCell>
                                            
                                            <TableCell align="right">
                                                <Box sx={{ 
                                                        display: 'inline-flex', alignItems: 'center', 
                                                        border: '1px solid', borderColor: 'divider', borderRadius: 1,
                                                        bgcolor: state.isLocked ? 'action.hover' : 'background.paper'
                                                    }}>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handlers.handleDecrement(i)}
                                                        disabled={state.isLocked}
                                                        color={comp.quantity <= 1 ? "error" : "default"}
                                                    >
                                                        {comp.quantity <= 1 ? <DeleteIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
                                                    </IconButton>

                                                    <Typography sx={{ mx: 2, minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                                                        {comp.quantity}
                                                    </Typography>

                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handlers.handleIncrement(i)}
                                                        disabled={state.isLocked}
                                                        color="primary"
                                                    >
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {state.components.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                Lista de ingrediente este goală.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => onClose(false)} color="inherit">Închide</Button>
                    <Button 
                        variant="contained" 
                        onClick={handlers.handleSave} 
                        startIcon={<SaveIcon />} 
                        disabled={state.loading || state.isLocked}
                    >
                        Salvează Modificările
                    </Button>
                </DialogActions>
            </Dialog>

            {/* SNACKBAR PENTRU ERORI / INFO (SUS) */}
            <Snackbar 
                open={state.snackbar.open} 
                autoHideDuration={4000} 
                onClose={handlers.closeSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handlers.closeSnackbar} 
                    severity={state.snackbar.severity} 
                    variant="filled" 
                    sx={{ width: '100%' }}
                >
                    {state.snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default ProductCompositeConfigModal;