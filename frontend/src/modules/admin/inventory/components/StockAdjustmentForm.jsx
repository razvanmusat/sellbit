import React, { useEffect } from 'react';
import { 
    Box, TextField, Paper, MenuItem, Button, Typography,
    InputAdornment, IconButton, Snackbar, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';
import { useStockAdjustmentForm } from '../hooks/useStockAdjustmentForm';

const StockAdjustmentForm = ({ warehouseId, warehouseName }) => {
    
    const {
        reasons,
        selectedProduct,
        selectedReasonId, setSelectedReasonId,
        quantity, setQuantity,
        note, setNote,
        loading,
        snackbar,
        currentStock,
        newStock,
        handleProductSelect,
        handleClearSelection,
        handleIncrement,
        handleDecrement,
        handleSubmit,
        handleCloseSnackbar
    } = useStockAdjustmentForm(warehouseId);

    // UX: Focus Management
    const focusSearch = () => {
        setTimeout(() => {
            // Încercăm să găsim inputul indiferent dacă e ProductSearch sau TextField simplu
            const searchInput = document.querySelector('#adj-product-search') || document.querySelector('input[placeholder*="Caută"]');
            if (searchInput) searchInput.focus();
        }, 100);
    };

    useEffect(() => { focusSearch(); }, []);

    const handleSaveAndFocus = async () => {
        await handleSubmit();
        focusSearch();
    };

    // Logică Vizuală
    const isNegative = quantity < 0;
    const isPositive = quantity > 0;
    const isZero = quantity === 0;

    let buttonColor = 'grey'; 
    let buttonText = 'NU EXISTĂ MODIFICĂRI';
    
    if (isNegative) {
        buttonColor = 'error.main';
        buttonText = `SCADE STOC (${quantity})`;
    } else if (isPositive) {
        buttonColor = 'success.main';
        buttonText = `ADAUGĂ STOC (+${quantity})`;
    }

    const compactInputSx = {
        '& .MuiInputBase-root': { height: '40px' }, 
        '& .MuiInputLabel-root': { transform: 'translate(14px, 9px) scale(1)' },
        '& .MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
        bgcolor: '#fff'
    };

    const stockBoxStyle = {
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #c4c4c4',
        borderRadius: '4px',
        px: 2,
        minWidth: '140px',
        whiteSpace: 'nowrap',
        bgcolor: '#fff'
    };

    return (
        <Box sx={{ p: 2, maxWidth: '1200px', margin: '0 auto' }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                
                {/* TITLU GESTIUNE */}
                <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>
                    Operare ajustare stoc în: <span style={{ color: '#1976d2', textTransform: 'uppercase' }}>{warehouseName}</span>
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    
                    {/* RÂNDUL 1: CĂUTARE (FLEX) + STOCURI (FIXE) */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                        
                        {/* SEARCH - Flexibil cu corecții de înălțime și aliniere */}
                        <Box sx={{ 
                            flex: 1,                            
                            height: '40px',
                            display: 'flex', 
                            alignItems: 'center',
                            '& .MuiFormControl-root': { mb: 0, width: '100%' }, 
                            '& .MuiInputBase-root': { height: '40px' },
                            '& > div': { width: '100%' }
                        }}>
                            {!selectedProduct ? (
                                <ProductSearch 
                                    id="adj-product-search"
                                    warehouseId={warehouseId}
                                    onProductSelect={handleProductSelect}
                                    onlyTrackStock={true}
                                    showStock={true} 
                                    showPrice={false}
                                />
                            ) : (
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={selectedProduct.name}
                                    sx={{ 
                                        ...compactInputSx, 
                                        width: '100%'
                                    }}
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            startAdornment: (<InputAdornment position="start"><EditIcon color="primary" /></InputAdornment>),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => { handleClearSelection(); focusSearch(); }} color="error" size="small">
                                                        <ClearIcon fontSize="small" />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                            sx: { bgcolor: '#f5f5f5', fontWeight: 'bold' }
                                        }
                                    }}
                                />
                            )}
                        </Box>
                        
                        {/* STOC ACTUAL - Fix */}
                        <Box sx={{ ...stockBoxStyle, bgcolor: '#f8f9fa', color: 'text.secondary' }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>STOC ACTUAL:</Typography>
                            <Typography variant="body1" fontWeight="900" sx={{ minWidth: '3.5ch', textAlign: 'center' }}>{currentStock}</Typography>
                        </Box>

                        <ArrowRightAltIcon color="action" />

                        {/* STOC NOU - Fix */}
                        <Box sx={{ 
                            ...stockBoxStyle, 
                            bgcolor: isZero ? '#fff' : (newStock < 0 ? '#ffebee' : '#e8f5e9'),
                            borderColor: isZero ? '#c4c4c4' : (newStock < 0 ? 'error.main' : 'success.main'),
                            color: isZero ? 'text.secondary' : (newStock < 0 ? 'error.dark' : 'success.dark')
                        }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>STOC NOU:</Typography>
                            <Typography variant="body1" fontWeight="900" sx={{ minWidth: '3.5ch', textAlign: 'center' }}>{newStock}</Typography>
                        </Box>
                    </Box>

                    {/* RÂNDUL 2: MOTIV | CANTITATE | NOTĂ | BUTON */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        
                        {/* MOTIV - Rămâne sub Search, lățime fixă */}
                        <Box sx={{ width: '250px' }}>
                            <TextField
                                select
                                label="Motiv Ajustare"
                                fullWidth
                                size="small"
                                value={selectedReasonId}
                                onChange={(e) => setSelectedReasonId(e.target.value)}
                                disabled={!selectedProduct}
                                sx={compactInputSx}
                            >
                                {reasons.map((r) => (
                                    <MenuItem key={r.id} value={r.id}>
                                        {r.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        {/* CANTITATE CONTROLATĂ (+/-) */}
                        <Box sx={{ width: '165px' }}>
                            <TextField
                                label="Cantitate de Ajustat"
                                type="number"
                                fullWidth
                                size="small"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                disabled={!selectedProduct}
                                sx={{ ...compactInputSx, '& input': { textAlign: 'center', fontWeight: 'bold' } }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <IconButton onClick={handleDecrement} disabled={!selectedProduct} size="small" color="error">
                                                    <RemoveIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={handleIncrement} disabled={!selectedProduct} size="small" color="success">
                                                    <AddIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }
                                }}
                            />
                        </Box>

                        {/* NOTĂ */}
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                label="Notă (Opțional)"
                                fullWidth
                                size="small"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={!selectedProduct}
                                sx={compactInputSx}
                            />
                        </Box>

                        {/* BUTON SALVARE */}
                        <Box sx={{ width: '220px' }}>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleSaveAndFocus}
                                disabled={!selectedProduct || isZero || loading}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                sx={{ 
                                    height: '40px', 
                                    fontWeight: '900',
                                    fontSize: '0.9rem',
                                    bgcolor: isZero ? 'grey.300' : buttonColor,
                                    color: '#fff',
                                    '&:hover': { bgcolor: isZero ? 'grey.400' : buttonColor, filter: 'brightness(0.9)' },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {buttonText}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default StockAdjustmentForm;