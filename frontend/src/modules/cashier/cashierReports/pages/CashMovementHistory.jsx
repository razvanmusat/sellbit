
import React from 'react';
import PropTypes from 'prop-types';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField,
    CircularProgress, Alert, Chip, MenuItem
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro';
import dayjs from 'dayjs';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import { useSearchParams } from 'react-router-dom';
import { useCashMovementHistory } from '../hooks/useCashMovementHistory';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashMovementTypes } from '../store/cashMovementHistorySlice';

const CashMovementHistory = ({ warehouseId }) => {
    const [searchParams, setSearchParams] = useSearchParams();    
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
    } = useCashMovementHistory(warehouseId, initialFilters);
    
    React.useEffect(() => {
        if (!warehouseId || !startDate || !endDate) return;
        const urlStart = searchParams.get('startDate');
        const urlEnd = searchParams.get('endDate');
        const urlType = searchParams.get('type');
        const shouldUpdate =
            urlStart !== startDate.format('YYYY-MM-DD') ||
            urlEnd !== endDate.format('YYYY-MM-DD') ||
            (selectedType || '') !== (urlType || '');
        if (shouldUpdate) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', 'history');
            params.set('warehouseId', warehouseId);
            params.set('startDate', startDate.format('YYYY-MM-DD'));
            params.set('endDate', endDate.format('YYYY-MM-DD'));
            if (selectedType) {
                params.set('type', selectedType);
            } else {
                params.delete('type');
            }
            setSearchParams(params, { replace: true });
        }
    }, [warehouseId, startDate, endDate, selectedType]);

    const compactCellStyle = { padding: '4px 8px', width: '1%', whiteSpace: 'nowrap' };
    const fluidCellStyle = { padding: '4px 8px', width: 'auto' };

    if (!warehouseId) return null;
    
    const typeChosen = typeof selectedType === 'string' && (selectedType.length > 0 || selectedType === 'ALL');

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: { xs: 1, sm: 2 } }}>                
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
                                    sx: { bgcolor: 'white', width: { xs: '100%', sm: 160 } }
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
                                    sx: { bgcolor: 'white', width: { xs: '100%', sm: 160 } }
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
                                bgcolor: 'white',
                                width: { xs: '100%', sm: 'auto' },
                                minWidth: { sm: 260 },
                                flexGrow: { sm: 1, md: 0 }
                            }}
                            slotProps={{
                                select: { displayEmpty: true },
                                inputLabel: {
                                    shrink: true
                                }
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
                {/* ZONA DE TABEL */}
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
            </Box>
        </LocalizationProvider>
    );
};

CashMovementHistory.propTypes = {
    warehouseId: PropTypes.number.isRequired,
};

export default CashMovementHistory;