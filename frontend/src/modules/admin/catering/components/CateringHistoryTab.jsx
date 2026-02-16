import React from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, Stack, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

// Import Hook
import { useCateringHistory } from '../hooks/useCateringHistory';

const CateringHistoryTab = () => {
    // Folosim Hook-ul custom
    const {
        startDate, setStartDate,
        endDate, setEndDate,
        groups,
        grandTotal,
        isLoading
    } = useCateringHistory();

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: 2 }}>
                
                {/* --- HEADER --- */}
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2}>
                            <DatePicker 
                                label="De la" 
                                value={startDate} 
                                onChange={setStartDate} 
                                slotProps={{ textField: { size: 'small' } }} 
                                format="DD/MM/YYYY" 
                            />
                            <DatePicker 
                                label="Până la" 
                                value={endDate} 
                                onChange={setEndDate} 
                                slotProps={{ textField: { size: 'small' } }} 
                                format="DD/MM/YYYY" 
                            />
                        </Stack>
                        <Box textAlign="right">
                            <Typography variant="caption" display="block" color="text.secondary">
                                TOTAL PLĂTIT
                            </Typography>
                            <Typography variant="h5" color="success.main" fontWeight="bold">
                                {grandTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* --- LISTA --- */}
                {isLoading && groups.length === 0 ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : groups.length === 0 ? (
                    <Alert severity="info">Nu există plăți înregistrate în acest interval.</Alert>
                ) : (
                    <Box>
                        {groups.map((dayGroup) => (
                            // NIVEL 1: ACORDEON ZI PLATĂ
                            <Accordion key={dayGroup.date} disableGutters sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'success.50' }}>
                                    <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" mr={2}>
                                        <Typography fontWeight="bold">
                                            PLATĂ EFECTUATĂ: {dayjs(dayGroup.date).format('DD MMMM YYYY')}
                                        </Typography>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Typography variant="body2" color="text.secondary">
                                                {dayGroup.subGroups.length} grupuri comenzi
                                            </Typography>
                                            <Chip 
                                                label={`Total Zi: ${dayGroup.totalDay.toLocaleString('ro-RO')} RON`} 
                                                color="success" 
                                                size="small"
                                            />
                                        </Stack>
                                    </Stack>
                                </AccordionSummary>
                                
                                <AccordionDetails sx={{ p: 1, bgcolor: '#fafafa' }}>
                                    {/* NIVEL 2: LISTA SUB-GRUPURI (Data Comandă + Client) */}
                                    <Stack spacing={1}>
                                        {dayGroup.subGroups.map((subGroup) => (
                                            <Accordion key={subGroup.id} elevation={1}>
                                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                    <Stack direction="row" spacing={2} alignItems="center" width="100%">
                                                        
                                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 120 }}>
                                                            <CalendarTodayIcon fontSize="small" color="action" />
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {dayjs(subGroup.orderDate).format('DD.MM.YYYY')}
                                                            </Typography>
                                                        </Stack>

                                                        {subGroup.isReservation ? <PersonIcon color="primary" /> : <LocalBarIcon color="warning" />}
                                                        
                                                        <Typography sx={{ flex: 1, fontWeight: 'medium' }}>
                                                            {subGroup.reservationName}
                                                        </Typography>
                                                        
                                                        <Typography fontWeight="bold" sx={{ mr: 2 }}>
                                                            {subGroup.totalSubGroup.toLocaleString('ro-RO')} RON
                                                        </Typography>
                                                    </Stack>
                                                </AccordionSummary>
                                                
                                                <AccordionDetails sx={{ p: 0 }}>
                                                    {/* NIVEL 3: TABEL PRODUSE */}
                                                    <TableContainer component={Paper} elevation={0}>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Produs</TableCell>
                                                                    <TableCell align="right">Cantitate</TableCell>
                                                                    <TableCell align="right">Preț Unit.</TableCell>
                                                                    <TableCell align="right">Total</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {subGroup.items.map((item, idx) => (
                                                                    <TableRow key={`${subGroup.id}-${item.productId}-${idx}`}>
                                                                        <TableCell>{item.productName}</TableCell>
                                                                        <TableCell align="right">{item.quantity}</TableCell>
                                                                        <TableCell align="right">
                                                                            {item.unitPrice > 0 ? `${item.unitPrice} RON` : '-'}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                                            {item.lineTotal.toFixed(2)} RON
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </AccordionDetails>
                                            </Accordion>
                                        ))}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default CateringHistoryTab;