import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Paper, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Stack, Alert
} from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

// Iconițe
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EventIcon from '@mui/icons-material/Event';

// Redux
import { fetchSellReports, invalidateCache } from '../store/sellReportsSlice';

const METHOD_CONFIG = {
    CASH: { label: 'Numerar', icon: <AttachMoneyIcon />, color: '#2e7d32', bg: '#e8f5e9' },
    CARD: { label: 'Card', icon: <CreditCardIcon />, color: '#1976d2', bg: '#e3f2fd' },
    VOUCHER: { label: 'Voucher', icon: <CardGiftcardIcon />, color: '#ed6c02', bg: '#fff3e0' },
    BANK_TRANSFER: { label: 'Transfer', icon: <AccountBalanceIcon />, color: '#9c27b0', bg: '#f3e5f5' },
    ADVANCE: { label: 'Avans', icon: <EventIcon />, color: '#0288d1', bg: '#e1f5fe' },
};

const SellReports = ({ warehouseId, warehouseName }) => {
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = React.useState(dayjs());
  
  // Redux state
  const { receipts, loading, error } = useSelector((state) => state.sellReports);
  
  // Track cache status pentru a detecta invalidation
  const [cacheVersion, setCacheVersion] = React.useState(0);
  
  // Ascultă la invalidateCache prin pollingul Redux state
  const cached = useSelector((state) => state.sellReports?.cached || {});
  React.useEffect(() => {
    // Cand cached object se schimbă (ex: invalidateCache a șters keys), refetch
    setCacheVersion(prev => prev + 1);
  }, [cached]);

  // Dispatch fetch cand se schimbă date, warehouse SAU cand cache e invalidat
  React.useEffect(() => {
    if (warehouseId) {
      dispatch(fetchSellReports({ warehouseId, date: selectedDate }));
    }
  }, [warehouseId, selectedDate, cacheVersion, dispatch]);

  // --- STILURI IDENTICE CU REFUND PAGE ---
  // Acestea asigură că rândurile sunt mici și compacte
  const compactCellStyle = { padding: '4px 8px', width: '1%', whiteSpace: 'nowrap' };
  const fluidCellStyle = { padding: '4px 8px', width: 'auto' };

  // Calculate totals din receipts
  const totals = useMemo(() => {
    const stats = {
      CASH: 0, CARD: 0, VOUCHER: 0, BANK_TRANSFER: 0, ADVANCE: 0,
      grandTotal: 0
    };

    const REAL_MONEY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

    receipts.forEach(receipt => {
      if (receipt.payments) {
        receipt.payments.forEach(payment => {
          if (stats.hasOwnProperty(payment.methodCode)) {
             stats[payment.methodCode] += payment.amount;
             
             // Adunăm la grandTotal doar dacă este metodă de încasare reală
             if (REAL_MONEY_METHODS.includes(payment.methodCode)) {
                stats.grandTotal += payment.amount;
             }
          }
        });
      }
    });
    return stats;
  }, [receipts]);

  const MiniStatCard = ({ typeKey, value }) => {
      const config = METHOD_CONFIG[typeKey] || { label: typeKey, color: '#666', icon: null };
      return (
        <Card elevation={0} variant="outlined" sx={{ flex: 1, minWidth: '100px', bgcolor: config.bg, borderColor: config.color }}>
            <CardContent sx={{ p: '8px !important', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={0} color={config.color}>
                    {React.cloneElement(config.icon, { fontSize: 'small' })}
                    <Typography variant="caption" fontWeight="bold" textTransform="uppercase" fontSize="0.7rem">{config.label}</Typography>
                </Box>
                <Typography variant="body1" fontWeight="bold" color="text.primary">
                    {value.toFixed(2)}
                </Typography>
            </CardContent>
        </Card>
      );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1 }}>
        
        {/* ZONA DE SUS (Aceasta a rămas neschimbată funcțional, doar am păstrat layout-ul) */}
        <Box sx={{ flexShrink: 0, mb: 1 }}>
            <Box display="flex" gap={1} mb={1.5} flexWrap="nowrap" overflow="auto">
                {Object.keys(METHOD_CONFIG).map((key) => (
                    <MiniStatCard key={key} typeKey={key} value={totals[key]} />
                ))}
            </Box>

            <Box display="flex" alignItems="center" 
                 sx={{ bgcolor: '#fff', p: 1, borderRadius: 2, border: '1px solid #eee' }}>
                
                <Box sx={{ width: '151px' }}> 
                    <DatePicker
                        label="Data Raport"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        format="DD/MM/YYYY"
                    />
                </Box>

                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body1" color="text.secondary" mr={1}>
                        Total zi în <b>{warehouseName}</b>:
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ minWidth: '140px' }}>
                        {totals.grandTotal.toFixed(2)} <span style={{fontSize:'1rem'}}>RON</span>
                    </Typography>
                </Box>

                <Box sx={{ width: '20px' }} /> 
            </Box>

            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </Box>

        {/* === TABELUL MODIFICAT (Layout identic cu RefundPage) === */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white' }}>
            {/* Folosim Paper pentru container ca și în Refund */}
            <TableContainer component={Paper} elevation={0} sx={{ height: '100%', overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                    {/* Header gri, exact ca în Refund */}
                    <TableHead sx={{ bgcolor: '#eeeeee' }}>
                        <TableRow>
                            <TableCell align="center" sx={compactCellStyle}>Nr. Bon</TableCell>
                            <TableCell align="center" sx={compactCellStyle}>Ora</TableCell>
                            <TableCell align="left" sx={fluidCellStyle}>Explicație / Masă</TableCell>
                            <TableCell align="right" sx={compactCellStyle}>Total</TableCell>
                            {/* Coloana de detalii plată, puțin mai lată dar compactă */}
                            <TableCell align="left" sx={{ ...fluidCellStyle, borderLeft: '1px solid #e0e0e0' }}>Detalii Plată</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {receipts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Nu există tranzacții închise pentru data selectată.
                                </TableCell>
                            </TableRow>
                        ) : (
                            receipts.map((row) => {
                                const isRefund = row.totalAmount < 0;
                                return (
                                    <TableRow key={row.id} hover sx={{ bgcolor: isRefund ? '#fff5f5' : 'inherit' }}>
                                        
                                        {/* 1. Nr Bon */}
                                        <TableCell align="center" sx={compactCellStyle}>
                                            <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                                #{row.id}
                                            </Typography>
                                        </TableCell>

                                        {/* 2. Ora */}
                                        <TableCell align="center" sx={compactCellStyle}>
                                            <Typography variant="body2">
                                                {dayjs(row.closedAt).format('HH:mm')}
                                            </Typography>
                                        </TableCell>

                                        {/* 3. Explicație */}
                                        <TableCell align="left" sx={fluidCellStyle}>
                                            <Typography variant="body2" component="span" fontWeight={500}>
                                                {row.tableName}
                                            </Typography>
                                            
                                            {isRefund && (
                                                <Chip label="RETUR" size="small" color="error" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                                            )}
                                            
                                            {row.note && (
                                                <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                                                    ({row.note})
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* 4. Total */}
                                        <TableCell align="right" sx={compactCellStyle}>
                                            <Typography variant="body2" fontWeight="bold" color={isRefund ? 'error.main' : 'success.main'}>
                                                {row.totalAmount.toFixed(2)}
                                            </Typography>
                                        </TableCell>

                                        {/* 5. Detalii Plată (Optimizat pentru spațiu vertical) */}
                                        <TableCell align="left" sx={{ ...fluidCellStyle, borderLeft: '1px solid #f0f0f0' }}>
                                            <Box display="flex" flexDirection="column" gap={0}>
                                                {(row.payments || []).map((pay, idx) => {
                                                    const conf = METHOD_CONFIG[pay.methodCode] || { color: 'text.primary', label: pay.methodLabel };
                                                    return (
                                                        <Box key={idx} display="flex" alignItems="center" justifyContent="space-between" sx={{ minWidth: 140 }}>
                                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                                <Typography variant="caption" color={conf.color} fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                                                                    {conf.label}:
                                                                </Typography>
                                                                {pay.additionalInfo && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                                        #{pay.additionalInfo}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                                                                {pay.amount.toFixed(2)}
                                                            </Typography>
                                                        </Box>
                                                    )
                                                })}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default SellReports;