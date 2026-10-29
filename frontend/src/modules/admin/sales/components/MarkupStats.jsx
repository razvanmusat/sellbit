import React, { useState, useEffect } from 'react';
import { Box, Paper, Stack, Typography, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import { SalesService } from '../api/SalesService';

const fmt = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('ro-RO', { minimumFractionDigits: 2 }));

const Row = ({ label, value }) => (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.5 }}>
        <Typography color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Stack>
);

const Figures = ({ figures }) => (
    <>
        <Row label="Adaos (în sumă) fără TVA" value={`${fmt(figures.amount)} RON`} />
        <Row label="Adaos (în procent) fără TVA" value={`${fmt(figures.percent)}%`} />
    </>
);

const MarkupStats = () => {
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());
    const [search, setSearch] = useState('');
    const [report, setReport] = useState(null);

    useEffect(() => {
        const load = async () => {
            setReport(await SalesService.getMarkup({
                start: startDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                end: endDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss')
            }));
        };
        load();
    }, [startDate, endDate]);

    const term = search.trim().toLowerCase();
    const found = report && term ? report.products.filter(p => p.productName.toLowerCase().includes(term)) : [];

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, mt: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={2}>
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
                    </Stack>
                </Paper>

                <Stack spacing={2} sx={{ width: 600, maxWidth: '100%' }}>
                    {report && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                                Adaosul este calculat din vânzările pe intervalul ales.
                            </Typography>
                            <Figures figures={report.total} />
                        </Paper>
                    )}

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <TextField
                            label="Caută produs" value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small" fullWidth
                        />
                    </Paper>

                    {found.map(p => (
                        <Paper key={p.productId} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{p.productName}</Typography>
                            <Figures figures={p.figures} />
                        </Paper>
                    ))}
                </Stack>
            </Box>
        </LocalizationProvider>
    );
};

export default MarkupStats;
