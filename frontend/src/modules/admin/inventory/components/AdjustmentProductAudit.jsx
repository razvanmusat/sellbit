import React from 'react';
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
import dayjs from 'dayjs';
import 'dayjs/locale/ro'; 

// DATE PICKERS
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';
import { useAdjustmentProductAudit } from '../hooks/useAdjustmentProductAudit';

const AdjustmentProductAudit = ({ warehouseId }) => {
    
    const {
        selectedProduct, setSelectedProduct,
        startDate, setStartDate,
        endDate, setEndDate,
        loading, 
        error,
        processed
    } = useAdjustmentProductAudit(warehouseId);

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

    // --- SUB-COMPONENTA TABEL ---
    const AuditTable = ({ rows }) => (
        <TableContainer>
            <Table size="small">
                <TableHead sx={{ bgcolor: '#fafafa' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', py: 1, width: '180px' }}>
                            DATA & ORA
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', width: '180px' }}>
                            USER
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', width: '180px' }}>
                            MOTIV
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>
                            NOTĂ
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', width: '100px' }}>
                            AJUSTARE
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => {
                        const isPositive = Number(row.quantityChange) > 0;
                        return (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <HistoryIcon fontSize="small" color="primary" />
                                        <Typography variant="body2" fontWeight="bold">
                                            {dayjs(row.adjustedAt).format('DD.MM.YY HH:mm')}
                                        </Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                    {row.userName || '-'}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>
                                    {row.reasonLabel}
                                </TableCell>
                                <TableCell sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>
                                    {row.note || '-'}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900, color: isPositive ? 'success.main' : 'error.main' }}>
                                    {isPositive ? '+' : ''}{Number(row.quantityChange).toFixed(2)}
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
                <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        
                        {/* 1. SEARCH BAR */}
                        <Box sx={{ flex: 1, minWidth: '250px' }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'left' }}>
                                {selectedProduct ? 'PRODUS SELECTAT' : '\u00A0'}
                            </Typography>
                            
                            {!selectedProduct ? (                            
                                <Box sx={{ height: '32px', display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%' }}>
                                        <ProductSearch 
                                            id="audit-prod-search"
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

                        {/* 2. CALENDARE */}
                        <Box sx={{ width: 150 }}>
                            <Typography sx={labelStyle}>DE LA</Typography>
                            <DatePicker 
                                value={startDate} format="DD/MM/YYYY" 
                                onChange={(val) => setStartDate(val)}
                                disabled={!selectedProduct}
                                slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#fff' } } }}
                            />
                        </Box>
                        <Box sx={{ width: 150 }}>
                            <Typography sx={labelStyle}>PÂNĂ LA</Typography>
                            <DatePicker 
                                value={endDate} format="DD/MM/YYYY" 
                                onChange={(val) => setEndDate(val)}
                                disabled={!selectedProduct}
                                slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#fff' } } }}
                            />
                        </Box>

                        {/* 3. TOTALURI */}
                        <Box sx={{ width: 120 }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'center' }}>AJUSTARE NETĂ</Typography>
                            <Box sx={statBoxStyle}>
                                <Typography variant="body2" fontWeight="900" color={selectedProduct ? (processed.stats.totalAdjusted >= 0 ? "success.main" : "error.main") : "text.disabled"}>
                                    {selectedProduct ? (processed.stats.totalAdjusted > 0 ? '+' : '') + processed.stats.totalAdjusted : '-'}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ width: 100 }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'center' }}>OPERAȚIUNI</Typography>
                            <Box sx={statBoxStyle}>
                                <Typography variant="body2" fontWeight="900" color={selectedProduct ? "primary.main" : "text.disabled"}>
                                    {selectedProduct ? processed.stats.opsCount : '-'}
                                </Typography>
                            </Box>
                        </Box>

                    </Box>
                </Paper>

                {/* --- REZULTATE --- */}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {loading && <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>}

                {!selectedProduct && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, opacity: 0.7 }}>
                        <TouchAppIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">Selectează produsul pentru a începe</Typography>
                    </Box>
                )}

                {selectedProduct && !loading && processed.groups.length === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>Nu există ajustări în perioada selectată.</Alert>
                )}

                {selectedProduct && !loading && processed.groups.map((group, index) => (
                    <Paper key={group.id} elevation={2} sx={{ mb: 1, overflow: 'hidden', borderRadius: 2, border: '1px solid #eee' }}>
                        <Accordion 
                            disableGutters 
                            defaultExpanded={index === 0}
                            sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, bgcolor: '#fff', '&.Mui-expanded': { borderBottom: '1px solid #f0f0f0' } }}>
                                <Stack direction="row" alignItems="center" spacing={2} width="100%">
                                    <Stack direction="row" alignItems="center" spacing={1} minWidth={150}>
                                        <CalendarMonthIcon color="action" />
                                        <Typography variant="subtitle1" fontWeight="bold">{group.label}</Typography>
                                    </Stack>
                                    
                                    <Chip label={`${group.items.length} ajustări`} size="small" variant="outlined" />
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', mr: 2 }}>
                                        Net Perioadă: <b style={{ color: group.totalQty >= 0 ? 'green' : 'red' }}>
                                            {group.totalQty > 0 ? '+' : ''}{group.totalQty} buc
                                        </b>
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

export default AdjustmentProductAudit;