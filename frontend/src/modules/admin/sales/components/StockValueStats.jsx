import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, CircularProgress, Alert, Card, CardContent, Tabs, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, InputAdornment, IconButton
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import StorefrontIcon from '@mui/icons-material/Storefront';

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';

import { StockCurrentService } from '../../inventory/api/StockCurrentService';

const StockValueStats = ({ warehouses }) => {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
    const totalPurchase = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
    const totalSale = items.reduce((sum, item) => sum + (item.salePrice || 0), 0);
    const formatPrice = (value) => (value || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const selectedItem = selectedProduct ? items.find(item => item.productId === selectedProduct.id) : null;

    useEffect(() => {
        if (!selectedWarehouseId) return;
        let cancelled = false;
        const fetchStockValue = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await StockCurrentService.getStockValueByWarehouse(selectedWarehouseId);
                if (!cancelled) setItems(Array.isArray(data) ? data : []);
            } catch (err) {
                if (!cancelled) setError('Eroare la încărcarea datelor.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchStockValue();
        return () => { cancelled = true; };
    }, [selectedWarehouseId]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* SELECTOR GESTIUNE */}
            <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={selectedWarehouseId ?? false}
                    onChange={(e, val) => setSelectedWarehouseId(val)}
                    textColor="primary"
                    indicatorColor="primary"
                    centered
                >
                    {warehouses.map(w => (
                        <Tab key={w.id} label={w.name} value={w.id} />
                    ))}
                </Tabs>
            </Box>

            {!selectedWarehouseId ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 8, gap: 2, color: 'text.secondary' }}>
                    <StorefrontIcon sx={{ fontSize: 56, opacity: 0.3 }} />
                    <Typography variant="h6" color="text.secondary">
                        Selectează o gestiune
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, mt: 2 }}>
                    {error && <Alert severity="error" sx={{ width: 500 }}>{error}</Alert>}

                    <Card variant="outlined" sx={{ width: 700, borderRadius: 4, textAlign: 'center', border: '1px solid #eef0f2', bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#000', mb: 3 }}>
                                {selectedWarehouse?.name || '—'}
                            </Typography>
                            {loading ? <CircularProgress /> : (
                                <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 3 }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            Valoare stoc – preț achiziție
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                            (fără TVA)
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                            {formatPrice(totalPurchase)} RON
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            Valoare stoc – preț vânzare
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                            (fără TVA)
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                                            {formatPrice(totalSale)} RON
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 900, borderRadius: 2, p: 2 }}>
                        <Box sx={{ width: '450px', height: '40px', mx: 'auto' }}>
                            {!selectedProduct ? (
                                <ProductSearch warehouseId={selectedWarehouseId} onProductSelect={setSelectedProduct} onlyTrackStock showPrice={false} />
                            ) : (
                                <TextField fullWidth size="small" value={selectedProduct.name}
                                    sx={{ '& .MuiInputBase-root': { height: '40px', bgcolor: '#f5f5f5', fontWeight: 'bold' } }}
                                    slotProps={{ input: { readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setSelectedProduct(null)} color="error" size="small"><ClearIcon fontSize="small" /></IconButton></InputAdornment>) } }}
                                />
                            )}
                        </Box>
                    </Paper>

                    {selectedProduct && !loading && (
                        <Paper variant="outlined" sx={{ width: '100%', maxWidth: 900, borderRadius: 2 }}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#fafafa' }}>
                                        <TableRow>
                                            <TableCell>PRODUS</TableCell>
                                            <TableCell>UM</TableCell>
                                            <TableCell align="right">CANTITATE</TableCell>
                                            <TableCell align="right">VALOARE ACHIZIȚIE</TableCell>
                                            <TableCell align="right">VALOARE VÂNZARE</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {!selectedItem ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                                                    Nu există stoc pentru acest produs în această gestiune.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow hover>
                                                <TableCell sx={{ fontWeight: 500 }}>{selectedItem.productName}</TableCell>
                                                <TableCell>{selectedItem.unitName}</TableCell>
                                                <TableCell align="right">{selectedItem.quantity}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatPrice(selectedItem.purchasePrice)} RON</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatPrice(selectedItem.salePrice)} RON</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default StockValueStats;
