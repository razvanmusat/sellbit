import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, Stack, CircularProgress, Alert, Chip, IconButton, TextField, InputAdornment, 
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TouchAppIcon from '@mui/icons-material/TouchApp';

// DATE PICKERS
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro'; 

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';
import { PurchaseService } from '../api/PurchaseService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const ProductAudit = ({ warehouseId }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- STATE FILTRE (CALENDARE) ---
    // Default: Ziua 1 a lunii curente -> Azi
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());

    // State pentru acordeon expandat
    const [expanded, setExpanded] = useState(false);

    const handleChangeAccordion = (panelId) => (event, isExpanded) => {
        setExpanded(isExpanded ? panelId : false);
    };

    // --- STILURI UI ---
    const labelStyle = { 
        fontSize: '0.7rem', fontWeight: 'bold', color: 'text.secondary', mb: 0.5, 
        textTransform: 'uppercase', display: 'block', lineHeight: 1, minHeight: '0.7rem' 
    };
    
    const statBoxStyle = {
        height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0, 0, 0, 0.23)', borderRadius: '4px', bgcolor: '#f5f5f5', px: 1, whiteSpace: 'nowrap'
    };

    const selectedProductInputSx = {
        '& .MuiInputBase-root': { height: '40px', bgcolor: '#f5f5f5', fontWeight: 'bold' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.23)' }
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
                // Luăm tot istoricul (sau backend-ul ar putea suporta filtrare, dar momentan filtrăm local)
                const data = await PurchaseService.getByProduct(selectedProduct.id, warehouseId);
                // Sortăm descrescător (cel mai nou primul)
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

    // Reset la schimbarea gestiunii
    useEffect(() => {
        setSelectedProduct(null);
        setHistoryData([]);
        setStartDate(dayjs().startOf('month'));
        setEndDate(dayjs());
    }, [warehouseId]);

    // --- PROCESARE (FILTRARE DUPĂ DATĂ & GRUPARE PE LUNI) ---
    const processed = useMemo(() => {
        if (!historyData || historyData.length === 0 || !startDate || !endDate) {
            return { groups: [], stats: { currentStock: 0, stockValue: 0, lastPrice: 0 } };
        }

        let currentStock = 0, stockValue = 0;
        
        // 1. Calcul Statistici Generale (bazat pe STOCUL ACTUAL RĂMAS, indiferent de filtre)
        // De obicei stocul curent e calculat pe tot istoricul activ, nu doar pe perioada selectată
        historyData.forEach(item => {
            const rem = Number(item.remainingQuantity || 0);
            if (rem > 0) {
                currentStock += rem;
                stockValue += (rem * Number(item.purchasePrice));
            }
        });
        const lastEntry = historyData[0];
        const lastPrice = lastEntry ? Number(lastEntry.purchasePrice) : 0;

        // 2. Filtrare Istoric după Intervalul Selectat
        const filteredData = historyData.filter(item => {
            const date = dayjs(item.purchasedAt);
            // Includem capetele de interval (start și end inclusive)
            return (date.isSame(startDate, 'day') || date.isAfter(startDate, 'day')) && 
                   (date.isSame(endDate, 'day') || date.isBefore(endDate, 'day'));
        });

        // 3. Grupare pe Luni (ex: Februarie 2026)
        const groups = {};

        filteredData.forEach(item => {
            const date = dayjs(item.purchasedAt);
            const key = date.format('MM-YYYY'); 
            const monthName = date.format('MMMM').toUpperCase();
            const label = `${monthName} ${date.format('YYYY')}`;

            if (!groups[key]) {
                groups[key] = { 
                    id: key, 
                    label, 
                    items: [], 
                    totalQty: 0, 
                    sortKey: date.valueOf() // timestamp pentru sortare
                };
            }
            groups[key].items.push(item);
            groups[key].totalQty += Number(item.quantity);
        });

        // Sortăm grupurile descrescător (cele mai noi sus)
        const sortedGroups = Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);

        return { groups: sortedGroups, stats: { currentStock, stockValue, lastPrice } };

    }, [historyData, startDate, endDate]);

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

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: 2, bgcolor: '#f8f9fa', minHeight: '100%' }}>

                {/* --- CONTROL PANEL --- */}
                <Paper elevation={2} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
                    
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        
                        {/* 1. SEARCH BAR */}
                        <Box sx={{ flex: 1, minWidth: '250px' }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'left' }}>
                                {selectedProduct ? 'PRODUS SELECTAT' : '\u00A0'}
                            </Typography>
                            
                            {!selectedProduct ? (                            
                                <Box sx={{ height: '30px', display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%' }}>
                                        <ProductSearch 
                                            warehouseId={warehouseId}
                                            onProductSelect={(p) => setSelectedProduct(p)}
                                            onlyTrackStock={true} showPrice={false} showStock={true}
                                        />
                                    </Box>
                                </Box>
                            ) : (
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

                        {/* 2. CALENDARE (START - END) */}
                        <Box sx={{ width: 160 }}>
                            <Typography sx={labelStyle}>DE LA</Typography>
                            <DatePicker 
                                value={startDate} format="DD/MM/YYYY" 
                                onChange={(val) => setStartDate(val)}
                                disabled={!selectedProduct}
                                slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#fff' } } }}
                            />
                        </Box>
                        <Box sx={{ width: 160 }}>
                            <Typography sx={labelStyle}>PÂNĂ LA</Typography>
                            <DatePicker 
                                value={endDate} format="DD/MM/YYYY" 
                                onChange={(val) => setEndDate(val)}
                                disabled={!selectedProduct}
                                slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#fff' } } }}
                            />
                        </Box>

                        {/* 3. STATISTICI FIFO (Rămân aceleași indiferent de perioada filtrată pt consistență) */}
                        <Box sx={{ width: '100px', flexShrink: 0 }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'center' }}>STOC FIFO</Typography>
                            <Box sx={statBoxStyle}>
                                <Typography variant="body2" fontWeight="900" color={selectedProduct ? "primary.main" : "text.disabled"}>
                                    {selectedProduct ? processed.stats.currentStock : '-'}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ width: '120px', flexShrink: 0 }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'center' }}>VALOARE</Typography>
                            <Box sx={statBoxStyle}>
                                <Typography variant="body2" fontWeight="900" color={selectedProduct ? "success.main" : "text.disabled"}>
                                    {selectedProduct ? `${processed.stats.stockValue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON` : '-'}
                                </Typography>
                            </Box>
                        </Box>

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

                {!selectedProduct && !loading && (
                     <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, opacity: 0.7 }}>
                        <TouchAppIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">Selectează un produs pentru audit</Typography>
                    </Box>
                )}

                {selectedProduct && processed.groups.length === 0 && !loading && (
                    <Alert severity="info" sx={{ mt: 2 }}>Nu există recepții în intervalul selectat.</Alert>
                )}

                {selectedProduct && processed.groups.map((group, index) => (
                    <Paper key={group.id} elevation={2} sx={{ mb: 1, overflow: 'hidden', borderRadius: 2, border: '1px solid #eee' }}>
                        <Accordion 
                            disableGutters 
                            expanded={expanded === group.id}
                            onChange={handleChangeAccordion(group.id)}
                            sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, bgcolor: '#fff', '&.Mui-expanded': { borderBottom: '1px solid #f0f0f0' } }}>
                                <Stack direction="row" alignItems="center" spacing={2} width="100%">
                                    <Stack direction="row" alignItems="center" spacing={1} minWidth={150}>
                                        <CalendarMonthIcon color="action" />
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                            {group.label}
                                        </Typography>
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
                
            </Box>
        </LocalizationProvider>
    );
};

export default ProductAudit;