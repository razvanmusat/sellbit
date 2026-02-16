import React from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, Stack, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// Iconițele au revenit AICI, unde le este locul
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help'; 

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro'; 

// Import Hook
import { useCateringReport } from '../hooks/useCateringReport';

// Funcții ajutătoare pur vizuale (pentru a păstra JSX-ul curat)
const getDayStatusVisuals = (status) => {
    switch (status) {
        case 'PAID': return { color: 'success.50', icon: <CheckCircleIcon color="success" /> };
        case 'UNPAID': return { color: 'error.50', icon: <ErrorIcon color="error" /> };
        default: return { color: 'grey.100', icon: <HelpIcon color="action" /> };
    }
};

const getSubGroupStatusVisuals = (status) => {
    switch (status) {
        case 'PAID': return { label: 'Achitat', color: 'success', textColor: 'success.main' };
        case 'UNPAID': return { label: 'Restant', color: 'error', textColor: 'error.main' };
        default: return { label: 'Parțial', color: 'default', textColor: 'inherit' };
    }
};

const CateringOrdersReportTab = () => {
    const {
        startDate, setStartDate,
        endDate, setEndDate,
        reportData,
        loading
    } = useCateringReport();

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: 2 }}>
                
                {/* --- HEADER CONTROLS --- */}
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
                        
                        <Stack direction="row" spacing={3} alignItems="center">
                             <Box textAlign="right">
                                <Typography variant="caption" display="block" color="success.main" fontWeight="bold">ÎNCASAT</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {reportData.totals.paid.toLocaleString('ro-RO')} RON
                                </Typography>
                            </Box>
                            <Box textAlign="right">
                                <Typography variant="caption" display="block" color="error.main" fontWeight="bold">RESTANT</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {reportData.totals.unpaid.toLocaleString('ro-RO')} RON
                                </Typography>
                            </Box>
                            <Box textAlign="right" sx={{ borderLeft: '1px solid #ccc', pl: 2 }}>
                                <Typography variant="caption" display="block" color="text.secondary">TOTAL RULAJ</Typography>
                                <Typography variant="h6" fontWeight="bold">
                                    {reportData.totals.total.toLocaleString('ro-RO')} RON
                                </Typography>
                            </Box>
                        </Stack>
                    </Stack>
                </Paper>

                {/* --- LISTA MIXTĂ --- */}
                {loading && reportData.groups.length === 0 ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : reportData.groups.length === 0 ? (
                    <Alert severity="info">Nu există comenzi în intervalul selectat.</Alert>
                ) : (
                    <Box>
                        {reportData.groups.map((dayGroup) => {
                            // Calculăm vizualul aici, pe baza statusului din date
                            const visual = getDayStatusVisuals(dayGroup.status);

                            return (
                                <Accordion key={dayGroup.date} disableGutters sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: visual.color }}>
                                        <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" mr={2}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {visual.icon}
                                                <Typography fontWeight="bold">
                                                    LIVRARE: {dayjs(dayGroup.date).format('DD MMMM YYYY')}
                                                </Typography>
                                            </Stack>
                                            
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    {dayGroup.subGroups.length} grupuri
                                                </Typography>
                                                
                                                {dayGroup.status === 'PARTIAL' ? (
                                                     <Chip 
                                                        label={`${dayGroup.totalDay} RON (${dayGroup.unpaidDay} Restant)`} 
                                                        size="small" 
                                                        sx={{ bgcolor: '#fff', border: '1px solid #ccc' }}
                                                     />
                                                ) : (
                                                    <Chip 
                                                        label={`${dayGroup.totalDay} RON`} 
                                                        color={dayGroup.status === 'PAID' ? "success" : "error"} 
                                                        variant="filled"
                                                        size="small"
                                                    />
                                                )}
                                            </Stack>
                                        </Stack>
                                    </AccordionSummary>
                                    
                                    <AccordionDetails sx={{ p: 1, bgcolor: '#fff' }}>
                                        <Stack spacing={1}>
                                            {dayGroup.subGroups.map((subGroup) => {
                                                const subVisual = getSubGroupStatusVisuals(subGroup.subStatus);
                                                
                                                return (
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
                                                                
                                                                <Chip 
                                                                    label={subVisual.label} 
                                                                    color={subVisual.color} 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    sx={{ mr: 2, height: 24 }}
                                                                />

                                                                <Typography fontWeight="bold" sx={{ mr: 2 }}>
                                                                    {subGroup.totalSub.toLocaleString('ro-RO')} RON
                                                                </Typography>
                                                            </Stack>
                                                        </AccordionSummary>
                                                        
                                                        <AccordionDetails sx={{ p: 0 }}>
                                                            <TableContainer component={Paper} elevation={0}>
                                                                <Table size="small">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell>Produs</TableCell>
                                                                            <TableCell align="right">Cantitate</TableCell>
                                                                            <TableCell align="right">Preț Unit.</TableCell>
                                                                            <TableCell align="right">Status</TableCell>
                                                                            <TableCell align="right">Total</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {subGroup.items.map((item, idx) => (
                                                                            <TableRow key={`${subGroup.id}-${item.productId}-${idx}-${item.isPaid}`}>
                                                                                <TableCell>{item.productName}</TableCell>
                                                                                <TableCell align="right">{item.quantity}</TableCell>
                                                                                <TableCell align="right">
                                                                                    {item.unitPrice > 0 ? `${item.unitPrice} RON` : '-'}
                                                                                </TableCell>
                                                                                <TableCell align="right">
                                                                                    <Typography 
                                                                                        variant="caption" 
                                                                                        color={item.isPaid ? 'success.main' : 'error.main'}
                                                                                        fontWeight="bold"
                                                                                    >
                                                                                        {item.isPaid ? 'ACHITAT' : 'NEACHITAT'}
                                                                                    </Typography>
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
                                                );
                                            })}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default CateringOrdersReportTab;