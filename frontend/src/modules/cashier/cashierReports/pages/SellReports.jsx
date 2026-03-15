import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Paper, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Stack, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EventIcon from '@mui/icons-material/Event';

import { fetchSellReports, invalidateCache } from '../store/sellReportsSlice';
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

const METHOD_CONFIG = {
  CASH:          { label: 'Numerar',  icon: <AttachMoneyIcon />,    color: '#2e7d32', bg: '#e8f5e9' },
  CARD:          { label: 'Card',     icon: <CreditCardIcon />,     color: '#1976d2', bg: '#e3f2fd' },
  VOUCHER:       { label: 'Voucher',  icon: <CardGiftcardIcon />,   color: '#ed6c02', bg: '#fff3e0' },
  BANK_TRANSFER: { label: 'Transfer', icon: <AccountBalanceIcon />, color: '#9c27b0', bg: '#f3e5f5' },
  ADVANCE:       { label: 'Avans',    icon: <EventIcon />,          color: '#0288d1', bg: '#e1f5fe' },
};

const REAL_MONEY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

const compactCellStyle = { padding: '4px 8px', width: '1%', whiteSpace: 'nowrap' };
const fluidCellStyle   = { padding: '4px 8px', width: 'auto' };

/**
 * Returnează suma liniilor și plățile aferente gestiunii selectate.
 *
 * - Plățile cu warehouseId explicit → filtrate direct (exacte, fără calcul)
 * - Voucherele (warehouseId null) → distribuite proporțional (sunt reduceri globale)
 */
const getWarehouseView = (receipt, warehouseId) => {
  // Suma liniilor din gestiunea selectată
  const warehouseTotal = (receipt.items || [])
    .filter(item => item.warehouseId === warehouseId)
    .reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  // Toate plățile înregistrate pe gestiunea selectată
  // inclusiv voucher — acum are warehouseId explicit
  const payments = (receipt.payments || [])
    .filter(pay => pay.warehouseId === warehouseId)
    .filter(pay => pay.amount !== 0);

  return { warehouseTotal, payments };
};

const SellReports = ({ warehouses }) => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    warehouses.length > 0 ? warehouses[0].id : null
  );
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  const urlReportDate = searchParams.get('reportDate');
  const [selectedDate, setSelectedDate] = useState(
    urlReportDate ? dayjs(urlReportDate) : dayjs()
  );

  const { receipts, loading, error } = useSelector(state => state.sellReports);

  useEffect(() => {
    if (!urlReportDate) {
      const today = dayjs();
      setSelectedDate(today);
      const params = new URLSearchParams(searchParams.toString());
      params.set('reportDate', today.format('YYYY-MM-DD'));
      setSearchParams(params, { replace: true });
    } else {
      const urlDayjs = dayjs(urlReportDate);
      if (!selectedDate || !selectedDate.isSame(urlDayjs, 'day')) {
        setSelectedDate(urlDayjs);
      }
    }
  }, [urlReportDate]);

  useEffect(() => {
    if (!selectedDate) return;
    const formatted = selectedDate.format('YYYY-MM-DD');
    if (searchParams.get('reportDate') !== formatted) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('reportDate', formatted);
      setSearchParams(params, { replace: true });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedWarehouseId && selectedDate) {
      dispatch(fetchSellReports({ warehouseId: selectedWarehouseId, date: selectedDate }));
    }
  }, [selectedWarehouseId, selectedDate, dispatch]);

  useEffect(() => {
    const unsubscribe = onSalesDataChanged(() => {
      if (selectedWarehouseId && selectedDate) {
        dispatch(invalidateCache());
        dispatch(fetchSellReports({ warehouseId: selectedWarehouseId, date: selectedDate }));
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [dispatch, selectedWarehouseId, selectedDate]);

  const totals = useMemo(() => {
    const stats = { CASH: 0, CARD: 0, VOUCHER: 0, BANK_TRANSFER: 0, ADVANCE: 0, grandTotal: 0 };
    receipts.forEach(receipt => {
      const { payments } = getWarehouseView(receipt, selectedWarehouseId);
      payments.forEach(payment => {
        if (stats.hasOwnProperty(payment.methodCode)) {
          stats[payment.methodCode] += payment.amount;
          if (REAL_MONEY_METHODS.includes(payment.methodCode)) {
            stats.grandTotal += payment.amount;
          }
        }
      });
    });
    Object.keys(stats).forEach(k => { stats[k] = parseFloat(stats[k].toFixed(2)); });
    return stats;
  }, [receipts, selectedWarehouseId]);

  const sortedReceipts = useMemo(() => (
    [...receipts].sort((a, b) => {
      const aTime = dayjs(a?.closedAt);
      const bTime = dayjs(b?.closedAt);
      if (!aTime.isValid() && !bTime.isValid()) return 0;
      if (!aTime.isValid()) return 1;
      if (!bTime.isValid()) return -1;
      return aTime.diff(bTime);
    })
  ), [receipts]);

  const MiniStatCard = ({ typeKey, value }) => {
    const config = METHOD_CONFIG[typeKey] || { label: typeKey, color: '#666', icon: null, bg: '#fff' };
    return (
      <Card elevation={0} variant="outlined"
        sx={{ flex: 1, minWidth: '100px', bgcolor: config.bg, borderColor: config.color }}>
        <CardContent sx={{ p: '8px !important', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={0.5} color={config.color}>
            {React.cloneElement(config.icon, { fontSize: 'small' })}
            <Typography variant="caption" fontWeight="bold" textTransform="uppercase" fontSize="0.7rem">
              {config.label}
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight="bold" color="text.primary">
            {value.toFixed(2)}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const IncasatCell = ({ warehouseTotal, payments, isRefund }) => (
    <Box>
      {payments.map((pay, idx) => {
        const conf = METHOD_CONFIG[pay.methodCode] || { label: pay.methodLabel, color: 'text.primary' };
        return (
          <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" sx={{ minWidth: 150 }}>
            <Typography variant="caption" color={conf.color} fontWeight="500" sx={{ fontSize: '0.72rem' }}>
              {conf.label}:
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.72rem', ml: 1 }}>
              {pay.amount.toFixed(2)}
            </Typography>
          </Box>
        );
      })}
      <Divider sx={{ my: 0.3, borderColor: '#bdbdbd' }} />
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minWidth: 150 }}>
        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.72rem' }}>
          Total:
        </Typography>
        <Typography variant="caption" fontWeight="bold"
          color={isRefund ? 'error.main' : 'success.main'}
          sx={{ fontSize: '0.72rem', ml: 1 }}>
          {warehouseTotal.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1 }}>

        {/* SELECTOR GESTIUNI */}
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {warehouses.map(w => (
            <Chip
              key={w.id}
              label={w.name}
              onClick={() => setSelectedWarehouseId(w.id)}
              color={selectedWarehouseId === w.id ? 'primary' : 'default'}
              variant={selectedWarehouseId === w.id ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.95rem', px: 1, py: 2.5 }}
            />
          ))}
        </Stack>

        {/* MINI STAT CARDS */}
        <Box sx={{ flexShrink: 0, mb: 1 }}>
          <Box display="flex" gap={1} mb={1.5} flexWrap="nowrap" overflow="auto">
            {Object.keys(METHOD_CONFIG).map(key => (
              <MiniStatCard key={key} typeKey={key} value={totals[key]} />
            ))}
          </Box>

          {/* DATE PICKER + TOTAL */}
          <Box display="flex" alignItems="center"
            sx={{ bgcolor: '#fff', p: 1, borderRadius: 2, border: '1px solid #eee' }}>
            <Box sx={{ width: '151px' }}>
              <DatePicker
                label="Data Raport"
                value={selectedDate}
                onChange={setSelectedDate}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                format="DD/MM/YYYY"
              />
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary" mr={1}>
                Total zi în <b>{selectedWarehouse?.name || '—'}</b>:
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ minWidth: '140px' }}>
                {totals.grandTotal.toFixed(2)} <span style={{ fontSize: '1rem' }}>RON</span>
              </Typography>
            </Box>
            <Box sx={{ width: '20px' }} />
          </Box>

          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </Box>

        {/* TABEL BONURI */}
        <TableContainer
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            scrollbarGutter: 'stable',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            bgcolor: 'white',
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ ...compactCellStyle, bgcolor: '#eeeeee' }}>Nr. Bon</TableCell>
                <TableCell align="center" sx={{ ...compactCellStyle, bgcolor: '#eeeeee' }}>Ora</TableCell>
                <TableCell align="left"   sx={{ ...fluidCellStyle,   bgcolor: '#eeeeee' }}>Explicație / Masă</TableCell>
                <TableCell align="right"  sx={{ ...compactCellStyle, bgcolor: '#eeeeee' }}>Total Bon</TableCell>
                <TableCell align="left"   sx={{ ...fluidCellStyle,   bgcolor: '#eeeeee', borderLeft: '1px solid #e0e0e0' }}>
                  Încasat în {selectedWarehouse?.name || '—'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {loading ? 'Se încarcă...' : 'Nu există tranzacții închise pentru data selectată.'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedReceipts.map(row => {
                  const { warehouseTotal, payments } = getWarehouseView(row, selectedWarehouseId);
                  const isRefund = row.totalAmount < 0;

                  return (
                    <TableRow key={row.id} hover sx={{ bgcolor: isRefund ? '#fff5f5' : 'inherit' }}>

                      <TableCell align="center" sx={compactCellStyle}>
                        <Typography variant="body2" fontWeight="bold" color="text.secondary">
                          #{row.id}
                        </Typography>
                      </TableCell>

                      <TableCell align="center" sx={compactCellStyle}>
                        <Typography variant="body2">
                          {dayjs(row.closedAt).format('HH:mm')}
                        </Typography>
                      </TableCell>

                      <TableCell align="left" sx={fluidCellStyle}>
                        <Typography variant="body2" component="span" fontWeight={500}>
                          {row.tableName}
                        </Typography>
                        {isRefund && (
                          <Chip label="RETUR" size="small" color="error"
                            sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                        )}
                        {row.note && (
                          <Typography variant="caption"
                            sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                            ({row.note})
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={compactCellStyle}>
                        <Typography variant="body2" fontWeight="bold"
                          color={isRefund ? 'error.main' : 'text.primary'}>
                          {row.totalAmount.toFixed(2)}
                        </Typography>
                      </TableCell>

                      <TableCell align="left" sx={{ ...fluidCellStyle, borderLeft: '1px solid #f0f0f0' }}>
                        <IncasatCell
                          warehouseTotal={warehouseTotal}
                          payments={payments}
                          isRefund={isRefund}
                        />
                      </TableCell>

                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

      </Box>
    </LocalizationProvider>
  );
};

export default SellReports;