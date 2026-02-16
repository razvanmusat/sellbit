import React, { useEffect, useRef } from 'react';
import { 
    Box, TextField, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, IconButton, Alert, Snackbar, InputAdornment, Tooltip, Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';

import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro';

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';
import { useStockInForm } from '../hooks/useStockInFrom';

const StockInForm = ({ warehouseId }) => {
    
    const {
        selectedProduct,
        quantity, setQuantity,
        purchasePrice, setPurchasePrice,
        expirationDate, setExpirationDate,
        globalNote, setGlobalNote,
        pendingItems,
        snackbar,
        totalValue,
        handleProductSelect,
        handleClearSelection,
        handleAddItem,
        handleRemoveItem,
        handleSavePurchase,
        handleCloseSnackbar
    } = useStockInForm(warehouseId);

    // --- LOGICA UX (FOCUS MANAGEMENT) ---
    const quantityRef = useRef(null);

    // Funcție helper pentru focus pe căutare (Varianta sigură prin ID)
    const focusSearch = () => {
        setTimeout(() => {
            const searchInput = document.getElementById('product-search-bar');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    };

    // 1. La încărcare -> Focus pe Căutare
    useEffect(() => {
        focusSearch();
    }, []);

    // 2. Când se selectează produsul -> Focus pe Cantitate
    useEffect(() => {
        if (selectedProduct) {
            setTimeout(() => {
                if (quantityRef.current) {
                    quantityRef.current.focus();
                }
            }, 100);
        }
    }, [selectedProduct]);

    // 3. Wrapper pentru Adăugare -> Adaugă și sare înapoi la Căutare
    const handleAddItemAndFocus = () => {
        handleAddItem();
        focusSearch(); // <--- Sare înapoi la căutare
    };
    // ------------------------------------

    // Stil compact unitar
    const compactInputSx = {
        '& .MuiInputBase-root': { height: '40px' }, 
        '& .MuiInputLabel-root': { transform: 'translate(14px, 9px) scale(1)' },
        '& .MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
        bgcolor: '#fff'
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: 2, pb: 10 }}>
                
                {/* --- PAPER 1: DESIGN COMPACT --- */}
                <Paper elevation={3} sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                    <form autoComplete="off" noValidate>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            flexWrap: 'nowrap', 
                            width: '100%'
                        }}>
                            
                            {/* 1. SEARCH */}
                            <Box sx={{ width: '50%', flexShrink: 0, height: '40px' }}>
                                {!selectedProduct ? (
                                    <ProductSearch 
                                        id="product-search-bar" // ID PENTRU FOCUS SIGUR
                                        warehouseId={warehouseId}
                                        onProductSelect={handleProductSelect}
                                        onlyTrackStock={true}
                                        showPrice={false}
                                        showStock={true}
                                    />
                                ) : (
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Produs Selectat"
                                        value={selectedProduct.name}
                                        sx={compactInputSx}
                                        autoComplete="off"
                                        slotProps={{
                                            input: {
                                                readOnly: true,
                                                startAdornment: (<InputAdornment position="start"><EditIcon color="primary" sx={{ fontSize: 20 }} /></InputAdornment>),
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

                            {/* 2. CANTITATE */}
                            <Box sx={{ width: '120px', flexShrink: 0 }}>
                                <TextField 
                                    label="Cantitate"
                                    size="small"
                                    type="number"
                                    fullWidth 
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    disabled={!selectedProduct}
                                    sx={compactInputSx}
                                    inputRef={quantityRef}
                                    slotProps={{ input: { autoComplete: 'off' } }}
                                />
                            </Box>

                            {/* 3. PREȚ */}
                            <Box sx={{ width: '180px', flexShrink: 0 }}>
                                <TextField 
                                    label="Preț (fără TVA)"
                                    size="small"
                                    type="number"                                    
                                    fullWidth 
                                    value={purchasePrice}
                                    onChange={(e) => setPurchasePrice(e.target.value)}
                                    disabled={!selectedProduct}
                                    sx={compactInputSx}
                                    slotProps={{ input: { autoComplete: 'off' } }}
                                />
                            </Box>

                            {/* 4. CALENDAR */}
                            <Box sx={{ width: '165px', flexShrink: 0 }}>
                                <DatePicker
                                    label="Data Expirare"
                                    value={expirationDate}
                                    onChange={(newValue) => setExpirationDate(newValue)}
                                    disabled={!selectedProduct}
                                    format="DD/MM/YYYY"
                                    slotProps={{ 
                                        textField: { 
                                            size: 'small',
                                            fullWidth: true,
                                            sx: compactInputSx,
                                            autoComplete: 'off'
                                        },
                                        // ACEASTA ESTE LINIA CARE REZOLVĂ PROBLEMA CU TAB-UL DUBLU:
                                        openPickerButton: { tabIndex: -1 } 
                                    }}
                                />
                            </Box>

                            {/* 5. PLUS ALBASTRU */}
                            <Box sx={{ flexShrink: 0, ml: 'auto', mr: 1 }}>
                                <Tooltip title="Adaugă">
                                    <span>
                                        <IconButton 
                                            onClick={handleAddItemAndFocus}
                                            disabled={!selectedProduct}
                                            sx={{ 
                                                color: 'primary.main',
                                                p: 0,
                                                '& svg': { fontSize: '42px' }
                                            }}
                                        >
                                            <AddCircleIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>
                        </Box>
                    </form>
                </Paper>

                {/* --- PAPER 2: TABEL --- */}
                <Paper elevation={2} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#eeeeee' }}>
                                <TableRow>
                                    <TableCell align="center" sx={{ width: '50px', fontWeight: 'bold' }}>Nr.</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Produs</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cantitate</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Preț Achiziție</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valoare</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Data Expirare</TableCell>
                                    <TableCell align="center" sx={{ width: '80px', fontWeight: 'bold' }}>Șterge</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingItems.map((item, index) => (
                                    <TableRow key={item.uniqueId} hover>
                                        <TableCell align="center">{index + 1}</TableCell>
                                        <TableCell fontWeight="bold">{item.productName}</TableCell>
                                        <TableCell align="center">{item.quantity}</TableCell>
                                        <TableCell align="right">{item.purchasePrice.toFixed(2)}</TableCell>
                                        <TableCell align="right" fontWeight="bold">{(item.quantity * item.purchasePrice).toFixed(2)}</TableCell>
                                        <TableCell align="center">{item.expirationDate || '-'}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.uniqueId)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pendingItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                                            Nu ai adăugat produse.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {pendingItems.length > 0 && (
                                    <TableRow sx={{ bgcolor: '#fafafa', borderTop: '2px solid #e0e0e0' }}>
                                        <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>TOTAL NIR:</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
                                            {totalValue.toFixed(2)} RON
                                        </TableCell>
                                        <TableCell colSpan={2} />
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* --- PAPER 3: FOOTER --- */}
                <Paper elevation={4} sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid #ddd' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                label="Notițe / Detalii Factură"
                                fullWidth
                                multiline
                                rows={2}
                                variant="outlined"
                                value={globalNote}
                                onChange={(e) => setGlobalNote(e.target.value)}
                                sx={{ bgcolor: '#f9f9f9' }}
                                slotProps={{ input: { autoComplete: 'off' } }}
                            />
                        </Box>
                        <Box sx={{ width: '220px' }}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                startIcon={<SaveIcon />}
                                onClick={handleSavePurchase}
                                disabled={pendingItems.length === 0}
                                sx={{ height: '100%', fontWeight: 'bold' }}
                            >
                                ÎNREGISTREAZĂ NIR
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default StockInForm;