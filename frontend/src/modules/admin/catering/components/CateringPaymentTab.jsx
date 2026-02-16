import React from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Checkbox, Button, Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions, 
    CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro'; 

// Import Hook
import { useCateringPayment } from '../hooks/useCateringPayment';

const CateringPaymentTab = () => {
    // Folosim Hook-ul custom pentru logică
    const {
        startDate, setStartDate,
        endDate, setEndDate,
        selectedIds,
        isConfirmOpen, setIsConfirmOpen,
        loading,
        groupedData,
        totalToPay,
        flatFilteredCount,
        handleSelectAll,
        handleSelectDay,
        handleSelectSub,
        handleSelectRow,
        handlePayConfirm
    } = useCateringPayment();

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: 2 }}>
                
                {/* --- HEADER --- */}
                <Paper elevation={3} sx={{ p: 2, mb: 2, position: 'sticky', top: 0, zIndex: 10, bgcolor: '#fff' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Stack direction="row" alignItems="center">
                                <Checkbox 
                                    checked={flatFilteredCount > 0 && selectedIds.length === flatFilteredCount}
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < flatFilteredCount}
                                    onChange={handleSelectAll}
                                    disabled={flatFilteredCount === 0}
                                    size="small"
                                />
                                <Typography variant="body2" fontWeight="bold">Select All</Typography>
                            </Stack>
                            <DatePicker label="De la" value={startDate} onChange={setStartDate} slotProps={{ textField: { size: 'small' } }} format="DD/MM/YYYY" />
                            <DatePicker label="Până la" value={endDate} onChange={setEndDate} slotProps={{ textField: { size: 'small' } }} format="DD/MM/YYYY" />
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="h5" color="primary.main" fontWeight="bold">
                                {totalToPay.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                            </Typography>
                            <Button variant="contained" color="success" onClick={() => setIsConfirmOpen(true)} disabled={selectedIds.length === 0}>
                                PLĂTEȘTE
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {/* --- LISTA ACORDEOANE --- */}
                {loading ? <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box> : 
                 groupedData.length === 0 ? <Alert severity="info">Nu există comenzi neplătite în intervalul selectat.</Alert> : (
                    <Box>
                        {groupedData.map((dayGroup) => {
                            const dayIds = dayGroup.allIds;
                            const selCount = dayIds.filter(id => selectedIds.includes(id)).length;
                            const isDayChecked = selCount === dayIds.length;
                            const isDayIndeterminate = selCount > 0 && selCount < dayIds.length;

                            return (
                                // NIVEL 1: ACORDEON ZI
                                <Accordion key={dayGroup.date} disableGutters sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fff' }}>
                                        <Stack direction="row" alignItems="center" width="100%">
                                            <Checkbox 
                                                checked={isDayChecked} 
                                                indeterminate={isDayIndeterminate}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleSelectDay(dayIds, e.target.checked)}
                                                size="small"
                                                sx={{ p: 0.5, mr: 1 }}
                                            />
                                            <Typography fontWeight="bold" sx={{ flex: 1 }}>
                                                LIVRARE: {dayGroup.date} {/* Am lăsat formatarea implicită din groupedData sau poți pune dayjs format aici */}
                                            </Typography>
                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mr: 2 }}>
                                                <Typography variant="body2" color="text.secondary">{dayGroup.subGroups.length} grupuri</Typography>
                                                <Chip label={`${dayGroup.totalDay.toLocaleString('ro-RO')} RON`} color={selCount > 0 ? "primary" : "default"} size="small" />
                                            </Stack>
                                        </Stack>
                                    </AccordionSummary>
                                    
                                    <AccordionDetails sx={{ p: 1, bgcolor: '#fafafa' }}>
                                        <Stack spacing={1}>
                                            {dayGroup.subGroups.map((subGroup) => {
                                                const subIds = subGroup.allIds;
                                                const subSelCount = subIds.filter(id => selectedIds.includes(id)).length;
                                                const isSubChecked = subSelCount === subIds.length;
                                                const isSubIndeterminate = subSelCount > 0 && subSelCount < subIds.length;

                                                return (
                                                    // NIVEL 2: ACORDEON GRUP
                                                    <Accordion key={subGroup.id} elevation={1}>
                                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                            <Stack direction="row" alignItems="center" width="100%">
                                                                <Checkbox 
                                                                    checked={isSubChecked}
                                                                    indeterminate={isSubIndeterminate}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => handleSelectSub(subIds, e.target.checked)}
                                                                    size="small"
                                                                    sx={{ p: 0.5, mr: 1 }}
                                                                />
                                                                
                                                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 120 }}>
                                                                    <CalendarTodayIcon fontSize="small" color="action" />
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        {subGroup.orderDate}
                                                                    </Typography>
                                                                </Stack>

                                                                {subGroup.isReservation ? <PersonIcon color="primary" sx={{ mr: 1 }} /> : <LocalBarIcon color="warning" sx={{ mr: 1 }} />}
                                                                
                                                                <Typography sx={{ flex: 1, fontWeight: 'medium' }}>
                                                                    {subGroup.reservationName}
                                                                </Typography>
                                                                
                                                                <Typography fontWeight="bold" sx={{ mr: 2 }}>
                                                                    {subGroup.totalSubGroup.toLocaleString('ro-RO')} RON
                                                                </Typography>
                                                            </Stack>
                                                        </AccordionSummary>
                                                        
                                                        <AccordionDetails sx={{ p: 0 }}>
                                                            {/* NIVEL 3: TABEL */}
                                                            <TableContainer component={Paper} elevation={0}>
                                                                <Table size="small">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell padding="checkbox" />
                                                                            <TableCell>Produs</TableCell>
                                                                            <TableCell align="right">Cantitate</TableCell>
                                                                            <TableCell align="right">Preț Unit.</TableCell>
                                                                            <TableCell align="right">Total</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {subGroup.items.map((item, idx) => {
                                                                            const rowIds = item.originalIds;
                                                                            const isRowChecked = rowIds.every(id => selectedIds.includes(id));
                                                                            
                                                                            return (
                                                                                <TableRow 
                                                                                    key={`${subGroup.id}-${item.productId}-${idx}`} 
                                                                                    hover 
                                                                                    selected={isRowChecked} 
                                                                                    onClick={() => handleSelectRow(rowIds, !isRowChecked)} 
                                                                                    sx={{ cursor: 'pointer' }}
                                                                                >
                                                                                    <TableCell padding="checkbox">
                                                                                        <Checkbox checked={isRowChecked} size="small" />
                                                                                    </TableCell>
                                                                                    <TableCell>{item.productName}</TableCell>
                                                                                    <TableCell align="right">{item.quantity}</TableCell>
                                                                                    <TableCell align="right">{item.unitPrice > 0 ? `${item.unitPrice} RON` : '-'}</TableCell>
                                                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.lineTotal.toFixed(2)} RON</TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
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

                <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
                    <DialogTitle>Confirmare Plată</DialogTitle>
                    <DialogContent>
                        <Typography>Dorești să plătești <b>{selectedIds.length}</b> comenzi în valoare de <b style={{color: 'green'}}>{totalToPay.toLocaleString('ro-RO')} RON</b>?</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsConfirmOpen(false)}>Anulează</Button>
                        <Button onClick={handlePayConfirm} variant="contained" color="success" autoFocus>Confirmă</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
};

export default CateringPaymentTab;