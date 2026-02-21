import React from 'react';
import { 
    Box, Paper, Stack, Typography, TextField, InputAdornment, IconButton, 
    Accordion, AccordionSummary, AccordionDetails, Chip, Alert, 
    CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Divider,
    Grid 
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import StarIcon from '@mui/icons-material/Star';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import FlagIcon from '@mui/icons-material/Flag';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro'; 

import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';
import { useProductStats } from '../hooks/useProductStats';

// --- COMPONENTA TREND RESTAURATĂ ---
const TrendIndicator = ({ current, previous, label, prefix }) => {
    // Logica originală de calcul: (Curent - Anterior) / Anterior * 100
    const curr = parseFloat(current) || 0;
    const prev = parseFloat(previous) || 0;
    
    if (prev <= 0) {
        return (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: '#f5f5f5', px: 1, py: 0.5, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mr: 0.5 }}>{prefix}</Typography>
                <RemoveIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled">0%</Typography>
            </Stack>
        );
    }

    const percentChange = ((curr - prev) / prev) * 100;
    const isPositive = percentChange > 0;
    const color = isPositive ? 'success.main' : 'error.main';
    const bg = isPositive ? '#e8f5e9' : '#ffebee';
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;

    if (Math.abs(percentChange) < 0.1) {
        return (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: '#f5f5f5', px: 1, py: 0.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">{prefix}</Typography>
                <RemoveIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled">0%</Typography>
            </Stack>
        );
    }

    return (
        <Tooltip title={`${label}: ${prev.toLocaleString()} (anterior) → ${curr.toLocaleString()} (curent)`}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: bg, px: 1, py: 0.5, borderRadius: 1 }}>
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.secondary', mr: 0.5, fontSize: '0.65rem', textTransform: 'uppercase' }}>{prefix}</Typography>
                <Icon sx={{ fontSize: 16, color }} />
                <Typography variant="caption" fontWeight="bold" sx={{ color }}>
                    {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                </Typography>
            </Stack>
        </Tooltip>
    );
};

const TopListCard = ({ title, icon, data = [], valueKey, color }) => (
    <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden', borderRadius: 2 }}>
        <Box sx={{ p: 1.5, bgcolor: color + '.main', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
        </Box>
        <Box sx={{ p: 0 }}>
            {data && data.map((item, index) => (
                <Box key={index} sx={{ 
                    p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: index < data.length - 1 ? '1px solid #eee' : 'none',
                    bgcolor: index === 0 ? color + '.50' : 'inherit' 
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'text.secondary' }}>
                            {index + 1}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500, maxWidth: 160 }}>{item.productName}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                        {valueKey === 'totalAmount' ? `${(item[valueKey] || 0).toLocaleString('ro-RO')} RON` : `${item[valueKey] || 0} buc`}
                    </Typography>
                </Box>
            ))}
        </Box>
    </Paper>
);

const ProductStats = ({ warehouseId }) => {
    const {
        selectedProduct, setSelectedProduct, startDate, setStartDate, endDate, setEndDate,
        loading, error, dashboardStats, productTimeline, expanded, handleChangeAccordion
    } = useProductStats(warehouseId);

    const labelStyle = { fontSize: '0.7rem', fontWeight: 'bold', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase' };
    const statBoxStyle = { height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 0, 0, 0.23)', borderRadius: '4px', bgcolor: '#f5f5f5', px: 1 };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <Box sx={{ width: '450px' }}>
                            <Typography sx={labelStyle}>{selectedProduct ? 'PRODUS SELECTAT' : ''}</Typography>
                            {!selectedProduct ? (
                                <Box sx={{ height: '40px' }}><ProductSearch warehouseId={warehouseId} onProductSelect={setSelectedProduct} /></Box>
                            ) : (
                                <TextField fullWidth size="small" value={selectedProduct.name} sx={{ '& .MuiInputBase-root': { height: '40px', bgcolor: '#f5f5f5', fontWeight: 'bold' } }}
                                    slotProps={{ input: { readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setSelectedProduct(null)} color="error" size="small"><ClearIcon fontSize="small"/></IconButton></InputAdornment>) } }}
                                />
                            )}
                        </Box>
                        <Box sx={{ width: 160 }}>
                            <Typography sx={labelStyle}>DE LA</Typography>
                            <DatePicker value={startDate} format="DD/MM/YYYY" onChange={setStartDate} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                        </Box>
                        <Box sx={{ width: 160 }}>
                            <Typography sx={labelStyle}>PÂNĂ LA</Typography>
                            <DatePicker value={endDate} format="DD/MM/YYYY" onChange={setEndDate} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                        </Box>
                        <Box sx={{ width: 120 }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'center' }}>TOTAL CANT.</Typography>
                            <Box sx={statBoxStyle}><Typography variant="body2" fontWeight="900" color="primary.main">{selectedProduct ? `${productTimeline?.stats?.totalQty || 0} buc` : '-'}</Typography></Box>
                        </Box>
                        <Box sx={{ width: 160 }}>
                            <Typography sx={{ ...labelStyle, textAlign: 'center' }}>TOTAL ÎNCASAT</Typography>
                            <Box sx={statBoxStyle}><Typography variant="body2" fontWeight="900" color="success.main">{selectedProduct ? `${(productTimeline?.stats?.totalValue || 0).toLocaleString('ro-RO')} RON` : '-'}</Typography></Box>
                        </Box>
                    </Box>
                </Paper>

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {loading && <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>}
                    
                    {!selectedProduct && !loading && dashboardStats && (
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} lg={3}><TopListCard title="Top Vânzări (Cantitate)" icon={<StarIcon />} data={dashboardStats.bestSellers} valueKey="quantity" color="success" /></Grid>
                            <Grid item xs={12} sm={6} lg={3}><TopListCard title="Top Încasări (Valoare)" icon={<MonetizationOnIcon />} data={dashboardStats.bestRevenue} valueKey="totalAmount" color="primary" /></Grid>
                            <Grid item xs={12} sm={6} lg={3}><TopListCard title="Cele mai slabe (Cantitate)" icon={<ThumbDownIcon />} data={dashboardStats.worstSellers} valueKey="quantity" color="warning" /></Grid>
                            <Grid item xs={12} sm={6} lg={3}><TopListCard title="Cele mai slabe (Încasări)" icon={<MoneyOffIcon />} data={dashboardStats.worstRevenue} valueKey="totalAmount" color="error" /></Grid>
                        </Grid>
                    )}

                    {selectedProduct && !loading && productTimeline?.groups?.map((group, index) => {
                        const nextGroup = productTimeline.groups[index + 1]; // Luna anterioară (datele sunt DESC)
                        const isLast = index === productTimeline.groups.length - 1;

                        return (
                            <Paper key={group.id} elevation={2} sx={{ mb: 1, borderRadius: 2, border: '1px solid #eee', overflow: 'hidden' }}>
                                <Accordion disableGutters expanded={expanded === group.id} onChange={handleChangeAccordion(group.id)} sx={{ boxShadow: 'none' }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr auto 1fr', alignItems: 'center', width: '100%', pr: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <CalendarMonthIcon color="action" />
                                                <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{group.label}</Typography>
                                            </Stack>
                                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                {isLast ? (
                                                    <Chip icon={<FlagIcon sx={{ fontSize: 16 }} />} label="REFERINȚĂ" size="small" variant="outlined" />
                                                ) : (
                                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                                        <TrendIndicator current={group.groupQty} previous={nextGroup?.groupQty} label="Cantitate" prefix="Cant:" />
                                                        <TrendIndicator current={group.groupValue} previous={nextGroup?.groupValue} label="Valoare" prefix="Val:" />
                                                    </Box>
                                                )}
                                            </Box>
                                            <Stack direction="row" spacing={3} alignItems="center" justifyContent="flex-end">
                                                <Chip label={`${group.groupQty} buc`} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                                <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>{(group.groupValue || 0).toLocaleString('ro-RO')} RON</Typography>
                                            </Stack>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 0 }}>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: '#fafafa' }}>
                                                    <TableRow>
                                                        <TableCell>DATA</TableCell>
                                                        <TableCell>BON</TableCell>
                                                        <TableCell>CASIER</TableCell>
                                                        <TableCell align="right">CANT.</TableCell>
                                                        <TableCell align="right">PREȚ</TableCell>
                                                        <TableCell align="right">TOTAL</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {group.items?.map((item) => (
                                                        <TableRow key={item.id} hover>
                                                            <TableCell>{dayjs(item.date).format('DD.MM.YYYY HH:mm')}</TableCell>
                                                            <TableCell>#{item.receiptId}</TableCell>
                                                            <TableCell>{item.userName}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.quantity}</TableCell>
                                                            <TableCell align="right">{(item.price || 0).toFixed(2)}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>{(item.total || 0).toLocaleString('ro-RO')} RON</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </AccordionDetails>
                                </Accordion>
                            </Paper>
                        );
                    })}
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default ProductStats;