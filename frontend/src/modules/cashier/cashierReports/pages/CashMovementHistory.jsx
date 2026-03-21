import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField,
    CircularProgress, Alert, Chip, MenuItem, Tabs, Tab
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro';
import dayjs from 'dayjs';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useCashMovementHistory } from '../hooks/useCashMovementHistory';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashMovementTypes } from '../store/cashMovementHistorySlice';

const CashMovementHistory = () => {
    const { warehouses } = useOutletContext() || { warehouses: [] };
    const [searchParams, setSearchParams] = useSearchParams();

    const warehouseParam = searchParams.get('warehouseId');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(
        warehouseParam ? Number(warehouseParam) : null
    );

    const handleWarehouseChange = (e, newVal) => {
        setSelectedWarehouseId(newVal);
        const current = Object.fromEntries(searchParams);
        setSearchParams({ ...current, warehouseId: newVal }, { replace: true });
    };

    const urlStart = searchParams.get('startDate');
    const urlEnd = searchParams.get('endDate');
    const urlType = searchParams.get('type');
    const today = dayjs().startOf('day');

    const initialFilters = {
        startDate: urlStart ? dayjs(urlStart) : today,
        endDate: urlEnd ? dayjs(urlEnd) : today,
        selectedType: urlType || '',
        _init: true
    };

    const dispatch = useDispatch();
    const movementTypes = useSelector(state => state.cashMovementHistory.movementTypes);

    useEffect(() => {
        if (!movementTypes || movementTypes.length === 0) {
            dispatch(fetchCashMovementTypes());
        }
    }, []);

    const {
        filteredMovements,
        loading,
        error,
        selectedType,
        setSelectedType,
        startDate,
        setStartDate,
        endDate,
        setEndDate
    } = useCashMovementHistory(selectedWarehouseId, initialFilters);

    useEffect(() => {
        if (!selectedWarehouseId || !startDate || !endDate) return;
        const current = Object.fromEntries(searchParams);
        const formatted = {
            ...current,
            warehouseId: selectedWarehouseId,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
        };
        if (selectedType) {
            formatted.type = selectedType;
        } else {
            delete formatted.type;
        }
        setSearchParams(formatted, { replace: true });
    }, [selectedWarehouseId, startDate, endDate, selectedType]);

    const compactCellStyle = { padding: '4px 8px', width: '1%', whiteSpace: 'nowrap' };
    const fluidCellStyle = { padding: '4px 8px', width: 'auto' };

    const typeChosen = typeof selectedType === 'string' && (selectedType.length > 0 || selectedType === 'ALL');

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: { xs: 1, sm: 2 } }}>

                {/* SELECTOR GESTIUNI */}
                <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs
                        value={selectedWarehouseId ?? false}
                        onChange={handleWarehouseChange}
                        textColor="primary"
                        indicatorColor="primary"
                        centered
                    >
                        {warehouses.map(w => (
                            <Tab key={w.id} label={w.name} value={w.id} />
                        ))}
                    </Tabs>
                </Box>

                {/* ECRAN WELCOME */}
                {!selectedWarehouseId ? (
                    <Box sx={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        mt: 8, gap: 2, color: 'text.secondary',
                    }}>
                        <StorefrontIcon sx={{ fontSize: 56, opacity: 0.3 }} />
                        <Typography variant="h6" color="text.secondary">
                            Selectează o gestiune pentru a afișa mișcările de numerar
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* FILTRE */}
                        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                            <Box
                                display="flex"
                                flexDirection={{ xs: 'column', sm: 'row' }}
                                alignItems="center"
                                gap={2}
                                flexWrap="wrap"
                            >
                                <Box display="flex" alignItems="center" gap={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
                                    <HistoryIcon color="action" />
                                </Box>
                                <DatePicker
                                    label="De la"
                                    value={startDate}
                                    onChange={setStartDate}
                                    format="DD/MM/YYYY"
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            sx: { width: { xs: '100%', sm: 160 } }
                                        }
                                    }}
                                />
                                <DatePicker
                                    label="Până la"
                                    value={endDate}
                                    onChange={setEndDate}
                                    format="DD/MM/YYYY"
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            sx: { width: { xs: '100%', sm: 160 } }
                                        }
                                    }}
                                />
                                <TextField
                                    select
                                    size="small"
                                    label="Tip Mișcare"
                                    value={selectedType}
                                    onChange={e => setSelectedType(e.target.value)}
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 260 },
                                        flexGrow: { sm: 1, md: 0 },
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'white',
                                            borderRadius: 1,
                                        }
                                    }}
                                    slotProps={{
                                        select: { displayEmpty: true },
                                        inputLabel: { shrink: true }
                                    }}
                                >
                                    <MenuItem value="">
                                        <em style={{ color: '#9e9e9e', fontStyle: 'normal' }}>Alege tip mișcare</em>
                                    </MenuItem>
                                    <MenuItem value="ALL">Toate mișcările</MenuItem>
                                    {movementTypes.map((type) => (
                                        <MenuItem key={type.code} value={type.code}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                    {selectedType && selectedType !== 'ALL' &&
                                        !movementTypes.some(t => t.code === selectedType) && (
                                            <MenuItem key={selectedType} value={selectedType}>
                                                {(() => {
                                                    if (!movementTypes || movementTypes.length === 0) return '';
                                                    const foundType = movementTypes.find(t => t.code === selectedType);
                                                    if (foundType) return foundType.label;
                                                    const foundMov = filteredMovements.find(m => m.typeCode === selectedType);
                                                    if (foundMov) return foundMov.typeLabel;
                                                    return '';
                                                })()}
                                            </MenuItem>
                                        )
                                    }
                                </TextField>
                            </Box>
                        </Paper>

                        {/* TABEL */}
                        {!typeChosen ? (
                            <Alert severity="info">
                                Selectează tipul de mișcare numerar pentru a vedea rezultatele.
                            </Alert>
                        ) : loading ? (
                            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                        ) : filteredMovements.length === 0 ? (
                            <Alert severity="warning">
                                {selectedType === 'ALL'
                                    ? 'Nu există mișcări în perioada selectată.'
                                    : 'Nu există mișcări de acest tip în perioada selectată.'}
                            </Alert>
                        ) : (
                            <TableContainer component={Paper} elevation={1} sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#eeeeee' }}>
                                        <TableRow>
                                            <TableCell align="center" sx={compactCellStyle}>Data & Ora</TableCell>
                                            <TableCell align="center" sx={compactCellStyle}>Tip</TableCell>
                                            <TableCell align="center" sx={compactCellStyle}>Sumă</TableCell>
                                            <TableCell align="center" sx={fluidCellStyle}>Explicație</TableCell>
                                            <TableCell align="center" sx={compactCellStyle}>Utilizator</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredMovements.map((mov) => (
                                            <TableRow key={mov.id} hover>
                                                <TableCell align="center" sx={compactCellStyle}>
                                                    {dayjs(mov.createdAt).format('DD/MM/YYYY HH:mm')}
                                                </TableCell>
                                                <TableCell align="center" sx={compactCellStyle}>
                                                    <Chip
                                                        label={mov.typeLabel}
                                                        size="small"
                                                        color={['SALE', 'CASH_IN'].includes(mov.typeCode) ? "success" : "default"}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={compactCellStyle}>
                                                    <Typography fontWeight="bold" color={mov.amount >= 0 ? 'green' : 'error'}>
                                                        {mov.amount > 0 ? '+' : ''}{Number(mov.amount).toFixed(2)} RON
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="left" sx={{ ...fluidCellStyle, color: 'text.secondary', fontStyle: 'italic' }}>
                                                    {mov.note || '-'}
                                                </TableCell>
                                                <TableCell align="left" sx={compactCellStyle}>
                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                        <PersonIcon fontSize="small" color="disabled" />
                                                        <Typography variant="body2">{mov.userName}</Typography>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default CashMovementHistory;