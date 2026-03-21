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
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

const REAL_INCOME_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

const PaymentStats = ({ warehouses }) => {
    const dispatch = useDispatch();

    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const { list: receipts, loading, error } = useSelector((state) => state.receipts);

    useEffect(() => {
        if (startDate.isValid() && endDate.isValid()) {
            dispatch(setFilters({
                startDate: startDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                endDate: endDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                status: 'CLOSED'
            }));
            dispatch(fetchReceipts({ force: true }));
        }
    }, [startDate, endDate, dispatch]);

    useEffect(() => {
        if (!startDate.isValid() || !endDate.isValid()) return;
        const unsubscribe = onSalesDataChanged(() => {
            dispatch(setFilters({
                startDate: startDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                endDate: endDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                status: 'CLOSED'
            }));
            dispatch(fetchReceipts({ force: true }));
        });
        return unsubscribe;
    }, [dispatch, startDate, endDate]);

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

    const getAmountPerWarehouse = (receipt, methodCode, warehouseId) => {
        return (receipt.payments || [])
            .filter(p => p.methodCode === methodCode && p.warehouseId === warehouseId)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    };

    const formatAmount = (value) => {
        if (value === 0) return '0.00 RON';
        return `${Number(value).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`;
    };

    const processedData = useMemo(() => {
        if (!selectedPaymentMethod || selectedPaymentMethod === 'ALL') {
            const totalsMap = {
                'CASH': { methodCode: 'CASH', totalAmount: 0, perWarehouse: {} },
                'CARD': { methodCode: 'CARD', totalAmount: 0, perWarehouse: {} },
                'BANK_TRANSFER': { methodCode: 'BANK_TRANSFER', totalAmount: 0, perWarehouse: {} },
                'VOUCHER': { methodCode: 'VOUCHER', totalAmount: 0, perWarehouse: {} },
                'ADVANCE': { methodCode: 'ADVANCE', totalAmount: 0, perWarehouse: {} }
            };

            warehouses.forEach(w => {
                Object.keys(totalsMap).forEach(code => {
                    totalsMap[code].perWarehouse[w.id] = 0;
                });
            });

            (receipts || []).forEach(r => {
                (r.payments || []).forEach(p => {
                    const code = p.methodCode;
                    if (totalsMap[code]) {
                        totalsMap[code].totalAmount += Number(p.amount || 0);
                        if (p.warehouseId && totalsMap[code].perWarehouse[p.warehouseId] !== undefined) {
                            totalsMap[code].perWarehouse[p.warehouseId] += Number(p.amount || 0);
                        }
                    }
                });
            });
            return Object.values(totalsMap);
        } else {
            if (!receipts) return [];
            return receipts.reduce((acc, r) => {
                const methodPayments = (r.payments || []).filter(p => p.methodCode === selectedPaymentMethod);
                if (methodPayments.length > 0) {
                    const sum = methodPayments.reduce((s, p) => s + (p.amount || 0), 0);
                    const perWarehouse = {};
                    warehouses.forEach(w => {
                        perWarehouse[w.id] = getAmountPerWarehouse(r, selectedPaymentMethod, w.id);
                    });
                    acc.push({ ...r, totalAmount: sum, perWarehouse });
                }
                return acc;
            }, []);
        }
    }, [receipts, selectedPaymentMethod, warehouses]);

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
            if (!groupedMap[key]) groupedMap[key] = { date: key, items: [], total: 0, count: 0, perWarehouse: {} };
            warehouses.forEach(w => {
                if (groupedMap[key].perWarehouse[w.id] === undefined) groupedMap[key].perWarehouse[w.id] = 0;
                groupedMap[key].perWarehouse[w.id] += Number(item.perWarehouse?.[w.id] || 0);
            });
            groupedMap[key].items.push(item);
            groupedMap[key].total += Number(item.totalAmount ?? 0);
            groupedMap[key].count += 1;
        });
        return Object.values(groupedMap).sort((a, b) => b.date.localeCompare(a.date));
    }, [processedData, selectedPaymentMethod, warehouses]);

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
                            <InputLabel id="payment-method-label">Metodă de plată</InputLabel>
                            <Select
                                labelId="payment-method-label"
                                value={selectedPaymentMethod}
                                label="Metodă de plată"
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            >
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
                    ) : selectedPaymentMethod === 'ALL' ? (
                        <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Metodă</TableCell>
                                            {warehouses.map(w => (
                                                <TableCell key={w.id} align="right" sx={{ fontWeight: 'bold' }}>{w.name}</TableCell>
                                            ))}
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {processedData.map(item => {
                                            const details = getMethodDetails(item.methodCode);
                                            return (
                                                <TableRow key={item.methodCode} hover>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            {details.icon}
                                                            <Typography variant="body2" fontWeight="bold">{details.label}</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    {warehouses.map(w => (
                                                        <TableCell key={w.id} align="right">
                                                            <Typography
                                                                variant="body2"
                                                                color={item.perWarehouse[w.id] < 0 ? 'error.main' : item.perWarehouse[w.id] > 0 ? 'text.primary' : 'text.disabled'}
                                                            >
                                                                {formatAmount(item.perWarehouse[w.id])}
                                                            </Typography>
                                                        </TableCell>
                                                    ))}
                                                    <TableCell align="right">
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight="bold"
                                                            color={item.totalAmount < 0 ? 'error.main' : item.totalAmount > 0 ? 'primary.main' : 'text.disabled'}
                                                        >
                                                            {formatAmount(item.totalAmount)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    ) : processedData.length === 0 && !loading ? (
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
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {warehouses.map(w => (
                                                    <Box key={w.id} sx={{ width: 180, textAlign: 'left' }}>
                                                        <Typography
                                                            variant="caption"
                                                            color={group.perWarehouse[w.id] < 0 ? 'error.main' : 'text.secondary'}
                                                        >
                                                            {w.name}: <b>{formatAmount(group.perWarehouse[w.id])}</b>
                                                        </Typography>
                                                    </Box>
                                                ))}
                                                <Box sx={{ width: 180, textAlign: 'left' }}>
                                                    <Typography
                                                        fontWeight="bold"
                                                        color={group.total < 0 ? 'error.main' : 'primary.main'}
                                                        variant="h6"
                                                    >
                                                        {formatAmount(group.total)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>ORA</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>ID BON</TableCell>
                                                        {warehouses.map(w => (
                                                            <TableCell key={w.id} align="right" sx={{ fontWeight: 'bold' }}>{w.name}</TableCell>
                                                        ))}
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {group.items.map((r, idx) => (
                                                        <TableRow key={idx} hover>
                                                            <TableCell>{dayjs(r.closedAt || r.createdAt).format('HH:mm')}</TableCell>
                                                            <TableCell>
                                                                <Box component="span" onClick={() => openReceipt(r.id)}
                                                                    sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
                                                                    #{r.id}
                                                                </Box>
                                                            </TableCell>
                                                            {warehouses.map(w => (
                                                                <TableCell
                                                                    key={w.id}
                                                                    align="right"
                                                                    sx={{ color: (r.perWarehouse?.[w.id] ?? 0) < 0 ? 'error.main' : 'inherit' }}
                                                                >
                                                                    {formatAmount(r.perWarehouse?.[w.id] ?? 0)}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell
                                                                align="right"
                                                                sx={{ fontWeight: 'bold', color: Number(r.totalAmount) < 0 ? 'error.main' : 'inherit' }}
                                                            >
                                                                {formatAmount(Number(r.totalAmount))}
                                                            </TableCell>
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

                <ReceiptDetailModal open={modalOpen} onClose={() => setModalOpen(false)} receipt={selectedReceipt} />
            </Box>
        </LocalizationProvider>
    );
};

export default PaymentStats;