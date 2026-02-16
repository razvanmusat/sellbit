import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, Stack, CircularProgress, Alert, Chip, IconButton, TextField, InputAdornment, 
    Accordion, AccordionSummary, AccordionDetails, MenuItem, Select, FormControl
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InventoryIcon from '@mui/icons-material/Inventory';

import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';
import { PurchaseService } from '../api/PurchaseService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const ProductAudit = ({ warehouseId }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- STATE FILTRE ---
    const [selectedYear, setSelectedYear] = useState(dayjs().year());
    const [viewMode, setViewMode] = useState(''); 

    // --- STILURI UI ---
    
    // 1. Eticheta (Label) - Folosim minHeight pentru a garanta alinierea
    const labelStyle = { 
        fontSize: '0.7rem', 
        fontWeight: 'bold', 
        color: 'text.secondary', 
        mb: 0.5, 
        textTransform: 'uppercase',
        display: 'block',
        lineHeight: 1,
        minHeight: '0.7rem' // Înălțime minimă garantată
    };
    
    // 2. Cutie valori read-only (Stoc, Valoare)
    const statBoxStyle = {
        height: '40px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(0, 0, 0, 0.23)',
        borderRadius: '4px',
        bgcolor: '#f5f5f5', 
        px: 1,
        whiteSpace: 'nowrap'
    };

    // 3. Stil Input Produs Selectat (GRI + BOLD)
    const selectedProductInputSx = {
        '& .MuiInputBase-root': {
            height: '40px',
            bgcolor: '#f5f5f5', // Fundal GRI
            fontWeight: 'bold', // Text BOLD
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.23)'
        }
    };

    // --- FETCH DATA ---
    useEffect(() => {
        if (!selectedProduct?.id || !warehouseId) {
            setHistoryData([]);
            return;
        }

        const fetchAudit = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await PurchaseService.getByProduct(selectedProduct.id, warehouseId);
                const sortedData = (data || []).sort((a, b) => dayjs(b.purchasedAt).diff(dayjs(a.purchasedAt)));
                setHistoryData(sortedData);
            } catch (err) {
                setError(getFriendlyErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchAudit();
    }, [selectedProduct, warehouseId]);

    useEffect(() => {
        setSelectedProduct(null);
        setHistoryData([]);
        setSelectedYear(dayjs().year());
        setViewMode('');
    }, [warehouseId]);

    // --- PROCESARE ---
    const processed = useMemo(() => {
        if (!historyData || historyData.length === 0 || viewMode === '') {
            return { groups: [], stats: { currentStock: 0, stockValue: 0, lastPrice: 0 } };
        }

        let currentStock = 0, stockValue = 0;
        historyData.forEach(item => {
            const rem = Number(item.remainingQuantity || 0);
            if (rem > 0) {
                currentStock += rem;
                stockValue += (rem * Number(item.purchasePrice));
            }
        });
        const lastEntry = historyData[0];
        const lastPrice = lastEntry ? Number(lastEntry.purchasePrice) : 0;

        const filteredByYear = historyData.filter(item => dayjs(item.purchasedAt).year() === selectedYear);
        const groups = {};

        filteredByYear.forEach(item => {
            const date = dayjs(item.purchasedAt);
            let key = '', label = '', sortOrder = 0;

            if (viewMode === 'YEARLY') {
                key = 'FULL_YEAR'; label = `Anul ${selectedYear}`; sortOrder = 1;
            } else if (viewMode === 'SEMESTER') {
                const month = date.month(); 
                const sem = month < 6 ? 1 : 2;
                key = `SEM_${sem}`; label = `Semestrul ${sem}`; sortOrder = sem;
            } else if (viewMode === 'QUARTER') {
                const q = date.quarter();
                key = `Q_${q}`; label = `Trimestrul ${q}`; sortOrder = q;
            } else if (viewMode === 'MONTH') {
                key = date.format('MM'); label = date.format('MMMM').toUpperCase(); sortOrder = date.month();
            }

            if (!groups[key]) groups[key] = { id: key, label, items: [], totalQty: 0, sortKey: sortOrder };
            groups[key].items.push(item);
            groups[key].totalQty += Number(item.quantity);
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);
        return { groups: sortedGroups, stats: { currentStock, stockValue, lastPrice } };

    }, [historyData, selectedYear, viewMode]);

    const AuditTable = ({ rows }) => (
        <TableContainer>
            <Table size="small">
                <TableHead sx={{ bgcolor: '#fafafa' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', py: 1 }}>DATA RECEPȚIE</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>USER</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>INIȚIAL</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>RĂMAS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>PREȚ</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>EXPIRARE</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>STATUS</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        const isDepleted = Number(row.remainingQuantity) === 0;
                        return (
                            <TableRow key={row.id} hover sx={{ opacity: isDepleted ? 0.6 : 1 }}>
                                <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <HistoryIcon fontSize="small" color={isDepleted ? 'disabled' : 'primary'} />
                                        <Typography variant="body2" fontWeight="bold">
                                            {dayjs(row.purchasedAt).format('DD.MM.YY HH:mm')}
                                        </Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{row.userName || '-'}</TableCell>
                                <TableCell align="center">{row.quantity}</TableCell>
                                <TableCell align="center" sx={{ bgcolor: isDepleted ? 'transparent' : '#e3f2fd', fontWeight: 'bold' }}>
                                    {row.remainingQuantity}
                                </TableCell>
                                <TableCell align="right">{Number(row.purchasePrice).toFixed(2)}</TableCell>
                                <TableCell align="center">
                                    {row.expirationDate ? dayjs(row.expirationDate).format('DD.MM.YY') : '-'}
                                </TableCell>
                                <TableCell align="center">
                                    {isDepleted ? 
                                        <Chip label="EPUIZAT" size="small" variant="outlined" sx={{ color: 'text.disabled', fontSize: '0.65rem', height: 20 }} /> : 
                                        <Chip label="ACTIV" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 'bold' }} />
                                    }
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const availableYears = useMemo(() => {
    if (!historyData || historyData.length === 0) return [dayjs().year()];
    
    // Extragem anii unici din data achiziției (purchasedAt)
    const years = historyData.map(item => dayjs(item.purchasedAt).year());
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a); // Sortăm descrescător
    
    return uniqueYears;
}, [historyData]);

    return (
        <Box sx={{ p: 2, bgcolor: '#f8f9fa', minHeight: '100%' }}>

            {/* --- PAPER 1: CONTROL PANEL --- */}
            <Paper elevation={2} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
                
                {/* ALIGN-ITEMS: 'FLEX-END' aliniază totul la bază */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    
                    {/* 1. SEARCH BAR / PRODUS SELECTAT */}
                    <Box sx={{ flex: 1, minWidth: '250px' }}>
                        {/* TRUC VIZUAL: '\u00A0' (Non-breaking space) rezervă înălțimea liniei chiar dacă nu e text */}
                        <Typography sx={{ ...labelStyle, textAlign: 'left' }}>
                            {selectedProduct ? 'PRODUS SELECTAT' : '\u00A0'}
                        </Typography>
                        
                        {!selectedProduct ? (                            
                            <Box sx={{ height: '32px', display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%' }}>
                                    <ProductSearch 
                                        warehouseId={warehouseId}
                                        onProductSelect={(p) => setSelectedProduct(p)}
                                        onlyTrackStock={true} showPrice={false} showStock={true}
                                    />
                                </Box>
                            </Box>
                        ) : (
                            // Input 'Embed' - Gri și Bold
                            <TextField
                                fullWidth
                                value={selectedProduct.name}
                                size="small"
                                sx={selectedProductInputSx}
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        startAdornment: (<InputAdornment position="start"><EditIcon color="primary" sx={{ fontSize: 20 }} /></InputAdornment>),
                                        endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setSelectedProduct(null)} color="error" size="small"><ClearIcon fontSize="small"/></IconButton></InputAdornment>),
                                    }
                                }}
                            />
                        )}
                    </Box>

                    {/* 2. SELECTOR AN */}
                    <Box sx={{ width: '100px', flexShrink: 0 }}>
                        <Typography sx={{ ...labelStyle, textAlign: 'center' }}>ANUL</Typography>
                        <FormControl fullWidth size="small">
                            <Select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(e.target.value)} 
                                disabled={!selectedProduct}
                                sx={{ bgcolor: '#fff', textAlign: 'center', height: '40px' }}
                            >
                                {availableYears.map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* 3. SELECTOR PERIOADĂ */}
                    <Box sx={{ width: '140px', flexShrink: 0 }}>
                        <Typography sx={{ ...labelStyle, textAlign: 'center' }}>PERIOADĂ</Typography>
                        <FormControl fullWidth size="small">
                            <Select 
                                value={viewMode} 
                                onChange={(e) => setViewMode(e.target.value)} 
                                disabled={!selectedProduct}
                                displayEmpty
                                sx={{ bgcolor: '#fff', height: '40px' }}
                            >
                                <MenuItem value="" disabled><em>Selectează...</em></MenuItem>
                                <MenuItem value="YEARLY">Anual</MenuItem>
                                <MenuItem value="SEMESTER">Semestrial</MenuItem>
                                <MenuItem value="QUARTER">Trimestrial</MenuItem>
                                <MenuItem value="MONTH">Lunar</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* 4. STOC FIFO */}
                    <Box sx={{ width: '100px', flexShrink: 0 }}>
                        <Typography sx={{ ...labelStyle, textAlign: 'center' }}>STOC FIFO</Typography>
                        <Box sx={statBoxStyle}>
                            <Typography variant="body2" fontWeight="900" color={selectedProduct ? "primary.main" : "text.disabled"}>
                                {selectedProduct ? processed.stats.currentStock : '-'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* 5. VALOARE */}
                    <Box sx={{ width: '120px', flexShrink: 0 }}>
                        <Typography sx={{ ...labelStyle, textAlign: 'center' }}>VALOARE</Typography>
                        <Box sx={statBoxStyle}>
                            <Typography variant="body2" fontWeight="900" color={selectedProduct ? "success.main" : "text.disabled"}>
                                {selectedProduct ? `${processed.stats.stockValue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON` : '-'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* 6. ULTIMUL PREȚ */}
                    <Box sx={{ width: '100px', flexShrink: 0 }}>
                        <Typography sx={{ ...labelStyle, textAlign: 'center' }}>ULTIMUL PREȚ</Typography>
                        <Box sx={statBoxStyle}>
                            <Typography variant="body2" fontWeight="bold" color={selectedProduct ? "text.primary" : "text.disabled"}>
                                {selectedProduct ? processed.stats.lastPrice.toFixed(2) : '-'}
                            </Typography>
                        </Box>
                    </Box>

                </Box>
            </Paper>

            {/* --- ZONA 2: REZULTATE --- */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>}

            {selectedProduct && processed.groups.map((group, index) => (
                <Paper key={group.id} elevation={2} sx={{ mb: 1, overflow: 'hidden', borderRadius: 2, border: '1px solid #eee' }}>
                    <Accordion disableGutters defaultExpanded={index === 0} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, bgcolor: '#fff', '&.Mui-expanded': { borderBottom: '1px solid #f0f0f0' } }}>
                            <Stack direction="row" alignItems="center" spacing={2} width="100%">
                                <Stack direction="row" alignItems="center" spacing={1} minWidth={150}>
                                    <CalendarMonthIcon color="action" />
                                    <Typography variant="subtitle1" fontWeight="bold">{group.label}</Typography>
                                </Stack>
                                
                                <Chip label={`${group.items.length} intrări`} size="small" variant="outlined" />
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', mr: 2 }}>
                                    Total recepționat: <b>{group.totalQty} buc</b>
                                </Typography>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
                            <AuditTable rows={group.items} />
                        </AccordionDetails>
                    </Accordion>
                </Paper>
            ))}
            
            {/* --- MESAJ GHIDARE DUPĂ SELECTARE PRODUS --- */}
{!viewMode && !loading && (
    <Box textAlign="center" py={5} color="text.secondary">
        <Typography variant="h6">
            {selectedProduct 
                ? "Selectează anul și perioada pentru audit" 
                : "Selectează un produs pentru a începe auditul"
            }
        </Typography>
    </Box>
)}
        </Box>
    );
};

export default ProductAudit;