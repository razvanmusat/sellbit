import React from 'react';
import { 
    Box, Paper, Button, TextField, InputAdornment, 
    CircularProgress, Alert, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, Typography,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Snackbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';

import { useInventoryOperation } from '../hooks/useInventoryOperation';

const InventoryOperation = ({ warehouseId }) => {
    const {
        loading,
        error,
        filterQuery, 
        setFilterQuery,
        groupedStock,
        physicalStockMap, 
        setPhysicalStockMap,
        requestSave,
        confirmSave,
        snackbar,
        closeSnackbar,
        confirmDialog,
        closeConfirmDialog
    } = useInventoryOperation(warehouseId);

    if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* CONTROL PANEL */}
            <Paper elevation={0} sx={{ 
                borderBottom: '1px solid rgba(0,0,0,0.1)', 
                p: 1, 
                bgcolor: 'transparent', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: 2 
            }}>
                <TextField 
                    placeholder="Caută produs (nume)..."
                    size="small"
                    autoComplete="off"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment> } }}
                    sx={{ width: 300, bgcolor: 'white' }}
                />
                <Button variant="contained" color="success" startIcon={<SaveIcon />} onClick={requestSave}>
                    Salvează Inventar
                </Button>
            </Paper>

            {/* TABEL OPERARE */}
            <Paper elevation={2} sx={{ m: 2, flex: 1, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: '100%' }}>
                    <Table 
                        size="small" 
                        stickyHeader 
                        sx={{ tableLayout: 'fixed', minWidth: 800 }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell width="20%" sx={{ fontWeight: 'bold' }}>Categorie</TableCell>
                                <TableCell width="35%" sx={{ fontWeight: 'bold' }}>Produs</TableCell>
                                <TableCell width="15%" align="center" sx={{ fontWeight: 'bold' }}>Scriptic</TableCell>
                                <TableCell width="15%" align="center" sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', borderLeft: '2px solid #c8e6c9',borderRight: '2px solid #c8e6c9' }}>
                                    FAPTIC
                                </TableCell>
                                <TableCell width="15%" align="center" sx={{ fontWeight: 'bold' }}>Diferență</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.keys(groupedStock).sort().map(cat => (
                                groupedStock[cat].map(item => {
                                    const physicalVal = physicalStockMap[item.productId];
                                    const diff = physicalVal !== undefined && physicalVal !== '' 
                                        ? (Number(physicalVal) - Number(item.quantity))
                                        : 0;
                                    
                                    const isModified = physicalVal !== undefined && physicalVal !== '';

                                    return (
                                        <TableRow key={item.productId} hover selected={isModified}>
                                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {cat}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.productName}
                                            </TableCell>
                                            <TableCell align="center">{Number(item.quantity).toLocaleString('ro-RO')}</TableCell>
                                            
                                            {/* INPUT FAPTIC */}
                                            <TableCell align="center" sx={{ bgcolor: isModified ? '#e8f5e9' : 'transparent', borderLeft: '2px solid #c8e6c9', borderRight: '2px solid #c8e6c9', p: 0.5 }}>
                                                <TextField 
                                                    size="small"
                                                    type="number"
                                                    autoComplete="off"
                                                    placeholder={item.quantity.toString()}
                                                    value={physicalVal || ''}
                                                    onChange={(e) => setPhysicalStockMap(prev => ({ ...prev, [item.productId]: e.target.value }))}
                                                    sx={{ 
                                                        '& input': { textAlign: 'center', fontWeight: 'bold', p: 0.5 },
                                                        '& fieldset': { border: 'none' }
                                                    }}
                                                />
                                            </TableCell>
                                            
                                            {/* DIFERENȚĂ */}
                                            <TableCell align="center">
                                                {isModified && Math.abs(diff) > 0.001 && (
                                                    <Chip 
                                                        label={(diff > 0 ? '+' : '') + diff.toLocaleString('ro-RO')} 
                                                        color={diff > 0 ? "success" : "error"} 
                                                        size="small" 
                                                        variant="filled"
                                                        sx={{ fontWeight: 'bold', minWidth: '60px' }}
                                                    />
                                                )}
                                                {isModified && Math.abs(diff) <= 0.001 && (
                                                     <Typography variant="caption" color="success.main">OK</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* CONFIRMATION DIALOG */}
            <Dialog
                open={confirmDialog.open}
                onClose={closeConfirmDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Confirmare Salvare Inventar"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Vei actualiza stocul pentru <strong>{confirmDialog.items.length}</strong> produse.
                        <br />
                        Diferențele vor fi înregistrate ca Ajustări. Ești sigur că dorești să continui?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeConfirmDialog} color="inherit">
                        Nu
                    </Button>
                    <Button onClick={confirmSave} color="success" variant="contained" autoFocus>
                        Da, Salvează
                    </Button>
                </DialogActions>
            </Dialog>

            {/* SNACKBAR NOTIFICATIONS */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default InventoryOperation;