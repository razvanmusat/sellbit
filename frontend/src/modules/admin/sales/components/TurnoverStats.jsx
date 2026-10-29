import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Stack, CircularProgress, Alert,
    Tabs, Tab, Collapse
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { SalesService } from '../api/SalesService';
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

const fmt = (v) => (v ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 });
const fmtDay = (iso) => iso.split('-').reverse().join('.');
const columns = '1.2fr 0.7fr 1fr 1fr 1fr';

const TableHeader = ({ first }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        {[first, 'Bonuri', 'Net', 'TVA', 'Total'].map((c, i) => (
            <Typography key={c} color="text.secondary" sx={{ fontSize: 13, fontWeight: 800, textAlign: i === 0 ? 'left' : 'right' }}>
                {c}
            </Typography>
        ))}
    </Box>
);

const TableRow = ({ label, row }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1, py: 0.5 }}>
        <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ textAlign: 'right' }}>{row.receiptCount}</Typography>
        <Typography sx={{ textAlign: 'right' }}>{fmt(row.net)}</Typography>
        <Typography sx={{ textAlign: 'right' }}>{fmt(row.vat)}</Typography>
        <Typography sx={{ textAlign: 'right', fontWeight: 700 }}>{fmt(row.total)}</Typography>
    </Box>
);

const SummaryRow = ({ label, value }) => (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
        <Typography color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Stack>
);

const TurnoverStats = ({ warehouses }) => {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());
    const [report, setReport] = useState(null);
    const [byDayOpen, setByDayOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

    useEffect(() => {
        if (!selectedWarehouseId) return;
        const unsubscribe = onSalesDataChanged(() => {
            setRefreshTick(v => v + 1);
        });
        return unsubscribe;
    }, [selectedWarehouseId]);

    useEffect(() => {
        const fetchTurnoverData = async () => {
            if (!selectedWarehouseId) return;
            let start = startDate;
            let end = endDate;
            if (start.isAfter(end)) [start, end] = [end, start];
            setLoading(true);
            setError(null);
            try {
                const params = {
                    warehouseId: selectedWarehouseId,
                    start: start.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                    end: end.endOf('day').format('YYYY-MM-DDTHH:mm:ss')
                };
                setReport(await SalesService.getTurnover(params));
            } catch (err) {
                setReport(null);
                setError('Eroare la încărcarea datelor.');
            } finally {
                setLoading(false);
            }
        };
        fetchTurnoverData();
    }, [selectedWarehouseId, startDate, endDate, refreshTick]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
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
                            Selectează o gestiune pentru a afișa cifra de afaceri
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, mt: 2 }}>
                        <Box sx={{ minWidth: 500, display: 'flex', justifyContent: 'center' }}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <DatePicker
                                        label="De la" value={startDate}
                                        onChange={setStartDate} format="DD/MM/YYYY"
                                        slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                                    />
                                    <DatePicker
                                        label="Până la" value={endDate}
                                        onChange={setEndDate} format="DD/MM/YYYY"
                                        slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                                    />
                                    <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                                        {loading && <CircularProgress size={20} />}
                                    </Box>
                                </Stack>
                            </Paper>
                        </Box>

                        {error && <Alert severity="error" sx={{ width: 500 }}>{error}</Alert>}

                        {report && (
                            <Stack spacing={2} sx={{ width: 770, maxWidth: '100%' }}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                                        {selectedWarehouse?.name || '—'}
                                    </Typography>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <Typography color="text.secondary" sx={{ fontWeight: 800 }}>
                                            Cifra de afaceri (fara TVA)
                                        </Typography>
                                        <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{fmt(report.net)} RON</Typography>
                                    </Stack>
                                    <SummaryRow label="TVA" value={`${fmt(report.vat)} RON`} />
                                    <SummaryRow label="Total cu TVA" value={`${fmt(report.total)} RON`} />
                                    <SummaryRow label="Număr de bonuri" value={String(report.receiptCount)} />
                                </Paper>

                                {report.byVatRate.length > 0 && (
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800, mb: 0.5 }}>
                                            PE COTĂ DE TVA
                                        </Typography>
                                        <TableHeader first="Cotă" />
                                        {report.byVatRate.map(r => (
                                            <TableRow key={r.vatRate} label={`${String(r.vatRate).replace('.', ',')}%`} row={r} />
                                        ))}
                                    </Paper>
                                )}

                                {report.byDay.length > 0 && (
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Stack
                                            direction="row"
                                            onClick={() => setByDayOpen(o => !o)}
                                            sx={{ alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                                        >
                                            <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
                                                PE ZI
                                            </Typography>
                                            <ExpandMoreIcon sx={{ color: 'text.secondary', transform: byDayOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                        </Stack>
                                        <Collapse in={byDayOpen} unmountOnExit>
                                            <Box sx={{ mt: 0.5 }}>
                                                <TableHeader first="Zi" />
                                                {report.byDay.map(r => (
                                                    <TableRow key={r.day} label={fmtDay(r.day)} row={r} />
                                                ))}
                                            </Box>
                                        </Collapse>
                                    </Paper>
                                )}
                            </Stack>
                        )}
                    </Box>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default TurnoverStats;