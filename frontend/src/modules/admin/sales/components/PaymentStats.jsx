import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Box, Paper, Typography, Divider, Stack, Alert, Select, MenuItem, 
    FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import MoneyIcon from '@mui/icons-material/Money';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ReceiptDetailModal from './ReceiptDetailModal';
import { SalesService } from '../api/SalesService';
import { fetchReceipts, setFilters } from '../store/receiptsSlice';

const REAL_INCOME_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

const PaymentStats = ({ warehouseId }) => {
    const dispatch = useDispatch();
    
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const { list: receipts, loading, error } = useSelector((state) => state.receipts);

    useEffect(() => {
        if (warehouseId && startDate.isValid() && endDate.isValid()) {
            dispatch(setFilters({
                startDate: startDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                endDate: endDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                status: 'CLOSED'
            }));
            dispatch(fetchReceipts({ warehouseId, force: true }));
        }
    }, [warehouseId, startDate, endDate, dispatch]);

    const getMethodDetails = (code) => {
        switch (code) {
            case 'CASH': return { label: 'Numerar', icon: <MoneyIcon /> };
            case 'CARD': return { label: 'Card Bancar', icon: <CreditCardIcon /> };
            case 'VOUCHER': return { label: 'Voucher', icon: <ReceiptLongIcon /> };
            case 'BANK_TRANSFER': return { label: 'Transfer Bancar', icon: <AccountBalanceIcon /> };
            case 'ADVANCE': return { label: 'Avans Petrecere', icon: <EventAvailableIcon /> };
            default: return { label: code, icon: <PointOfSaleIcon /> };
        }
    };

    const processedData = useMemo(() => {
        // Dacă selectăm ALL, returnăm harta completă, chiar dacă sumele sunt 0
        if (!selectedPaymentMethod || selectedPaymentMethod === 'ALL') {
            const totalsMap = {
                'CASH': { methodCode: 'CASH', totalAmount: 0 },
                'CARD': { methodCode: 'CARD', totalAmount: 0 },
                'BANK_TRANSFER': { methodCode: 'BANK_TRANSFER', totalAmount: 0 },
                'VOUCHER': { methodCode: 'VOUCHER', totalAmount: 0 },
                'ADVANCE': { methodCode: 'ADVANCE', totalAmount: 0 }
            };

            if (receipts && receipts.length > 0) {
                receipts.forEach(r => {
                    (r.payments || []).forEach(p => {
                        const code = p.methodCode;
                        if (totalsMap[code]) {
                            totalsMap[code].totalAmount += Number(p.amount || 0);
                        }
                    });
                });
            }
            return Object.values(totalsMap); // Am scos filtrul de > 0
        } else {
            if (!receipts) return [];
            return receipts.reduce((acc, r) => {
                const methodPayments = (r.payments || []).filter(p => p.methodCode === selectedPaymentMethod);
                if (methodPayments.length > 0) {
                    const sum = methodPayments.reduce((s, p) => s + (p.amount || 0), 0);
                    acc.push({ ...r, totalAmount: sum });
                }
                return acc;
            }, []);
        }
    }, [receipts, selectedPaymentMethod]);

    const totalGeneral = useMemo(() => {
        if (!processedData || processedData.length === 0) return 0;
        return processedData.reduce((sum, item) => {
            if (!selectedPaymentMethod || selectedPaymentMethod === 'ALL') {
                return REAL_INCOME_METHODS.includes(item.methodCode) 
                    ? sum + Number(item.totalAmount || 0) 
                    : sum;
            }
            return sum + Number(item.totalAmount || 0);
        }, 0);
    }, [processedData, selectedPaymentMethod]);

    const groupedArray = useMemo(() => {
        if (selectedPaymentMethod === 'ALL' || selectedPaymentMethod === '') return [];
        const groupedMap = {};
        processedData.forEach(item => {
            const rawDate = item.closedAt || item.createdAt;
            const key = rawDate ? dayjs(rawDate).format('YYYY-MM-DD') : 'no-date';
            if (!groupedMap[key]) groupedMap[key] = { date: key, items: [], total: 0, count: 0 };
            groupedMap[key].items.push(item);
            groupedMap[key].total += Number(item.totalAmount ?? 0);
            groupedMap[key].count += 1;
        });
        return Object.values(groupedMap).sort((a, b) => b.date.localeCompare(a.date));
    }, [processedData, selectedPaymentMethod]);

    const openReceipt = async (id) => {
        try {
            const resp = await SalesService.getReceiptById(id);
            if (resp) { setSelectedReceipt(resp); setModalOpen(true); }
        } catch (err) { console.error('Failed to load receipt', err); }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <DatePicker label="De la" value={startDate} format="DD/MM/YYYY" onChange={setStartDate} slotProps={{ textField: { size: 'small' } }} />
                        <DatePicker label="Până la" value={endDate} format="DD/MM/YYYY" onChange={setEndDate} slotProps={{ textField: { size: 'small' } }} />
                        
                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                        
                        <FormControl size="small" sx={{ minWidth: 240 }}>
                            <InputLabel id="payment-method-label">Metodă plată</InputLabel>
                            <Select
                                labelId="payment-method-label"
                                value={selectedPaymentMethod}
                                label="Metodă plată"
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            >
                                <MenuItem value=""><em>Selectează metoda</em></MenuItem>
                                <MenuItem value="ALL" sx={{ fontWeight: 'bold' }}>Toate metodele de plată</MenuItem>
                                <MenuItem value="CASH">Numerar</MenuItem>
                                <MenuItem value="CARD">Card Bancar</MenuItem>
                                <MenuItem value="VOUCHER">Voucher</MenuItem>
                                <MenuItem value="BANK_TRANSFER">Transfer Bancar</MenuItem>
                                <MenuItem value="ADVANCE">Avans Petrecere</MenuItem>
                            </Select>
                        </FormControl>

                        {selectedPaymentMethod !== '' && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">TOTAL:</Typography>
                                <Typography variant="h6" color="primary.main" fontWeight="900">
                                    {totalGeneral.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                </Typography>
                            </Stack>
                        )}
                        {loading && <CircularProgress size={20} />}
                    </Stack>
                </Paper>

                {error && <Alert severity="error">{error}</Alert>}

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {selectedPaymentMethod === '' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
                            <Typography variant="h6">Selectează un filtru.</Typography>
                        </Box>
                    ) : (
                        <Box>
                            {selectedPaymentMethod === 'ALL' ? (
                                processedData.map(item => {
                                    const details = getMethodDetails(item.methodCode);
                                    return (
                                        <Paper key={item.methodCode} elevation={2} sx={{ mb: 1, borderRadius: 2 }}>
                                            <Accordion disableGutters sx={{ boxShadow: 'none' }}>
                                                <AccordionSummary sx={{ minHeight: 52 }}>
                                                    <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" sx={{ mr: 2 }}>
                                                        <Stack direction="row" spacing={2} alignItems="center">                                
                                                            {details.icon}
                                                            <Typography fontWeight="bold">{details.label}</Typography>
                                                        </Stack>
                                                        <Typography fontWeight="bold" color={item.totalAmount > 0 ? "primary.main" : "text.disabled"} variant="h6">
                                                            {Number(item.totalAmount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                                        </Typography>
                                                    </Stack>
                                                </AccordionSummary>
                                            </Accordion>
                                        </Paper>
                                    );
                                })
                            ) : (processedData.length === 0 && !loading) ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
                                    <Typography variant="h6">Nu există tranzacții.</Typography>
                                </Box>
                            ) : (
                                groupedArray.map(group => (
                                    <Paper key={group.date} elevation={2} sx={{ mb: 1, borderRadius: 2, overflow: 'hidden' }}>
                                        <Accordion disableGutters sx={{ boxShadow: 'none' }} defaultExpanded={groupedArray.length === 1}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" sx={{ mr: 2 }}>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Typography fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
                                                            {dayjs(group.date).format('DD MMMM YYYY')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">{group.count} bonuri</Typography>
                                                    </Stack>
                                                    <Typography fontWeight="bold" color="primary.main" variant="h6">
                                                        {group.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                                    </Typography>
                                                </Stack>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>ORA</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>ID BON</TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>VALOARE</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {group.items.map((r, idx) => (
                                                                <TableRow key={idx} hover>
                                                                    <TableCell>{dayjs(r.closedAt || r.createdAt).format('HH:mm')}</TableCell>
                                                                    <TableCell>
                                                                        <Box component="span" onClick={() => openReceipt(r.id)} sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
                                                                            #{r.id}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{Number(r.totalAmount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </AccordionDetails>
                                        </Accordion>
                                    </Paper>
                                ))
                            )}
                        </Box>
                    )}
                </Box>
                <ReceiptDetailModal open={modalOpen} onClose={() => setModalOpen(false)} receipt={selectedReceipt} />
            </Box>
        </LocalizationProvider>
    );
};

export default PaymentStats;