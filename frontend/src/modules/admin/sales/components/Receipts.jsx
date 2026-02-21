import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, CircularProgress, MenuItem, Select, FormControl, InputLabel,
    Stack, Chip, IconButton, Paper, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';

// --- IMPORTURI DATE ---
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro'; 

// ICONS
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// API & MODAL & HOOK
import ReceiptDetailModal from './ReceiptDetailModal';
import { useReceipts } from '../hooks/useReceipts'; // Import Hook

const Receipts = () => {
    // Păstrăm useSearchParams DOAR pentru a citi warehouseId din URL-ul paginii părinte
    const [searchParams] = useSearchParams();
    const warehouseId = searchParams.get('warehouseId') ? parseInt(searchParams.get('warehouseId')) : null;

    // Folosim Hook-ul pentru date și logică
    const {
        startDate, endDate, status,
        groupedReceipts, loading,
        setDate, setStatus,
        selectedReceipt, setSelectedReceipt,
        modalOpen, setModalOpen, openReceipt
    } = useReceipts(warehouseId);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', bgcolor: '#f8f9fa', p: 2 }}>
                
                <Paper elevation={1} sx={{ p: 2, flexShrink: 0, borderRadius: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2}>
                            <DatePicker sx={{ width: 160 }}
                                label="De la" value={startDate} format="DD/MM/YYYY"
                                onChange={(val) => setDate('start', val)}
                                slotProps={{ textField: { size: 'small' } }}
                            />
                            <DatePicker sx={{ width: 160 }}
                                label="Până la" value={endDate} format="DD/MM/YYYY"
                                onChange={(val) => setDate('end', val)}
                                slotProps={{ textField: { size: 'small' } }}
                            />
                        </Stack>

                        <FormControl size="small" sx={{ minWidth: 250 }}>
                            <InputLabel id="status-label" shrink>Status Bon</InputLabel>
                            <Select 
                                labelId="status-label"
                                value={status} 
                                label="Status Bon"
                                displayEmpty
                                onChange={(e) => setStatus(e.target.value)}
                                notched={true}
                            >
                                <MenuItem value="">
                                    <Typography color="text.secondary">Selectează status bon</Typography>
                                </MenuItem>
                                <MenuItem value="CLOSED">Închis (Vânzări)</MenuItem>
                                <MenuItem value="CANCELLED">Anulate</MenuItem>
                                <MenuItem value="REFUNDED">Stornate (Retururi)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Paper>

                <Box sx={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    scrollbarGutter: 'stable', 
                    pr: 0.5 
                }}>
                    {!status ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                            <Typography variant="h5">Alege un status pentru a genera raportul.</Typography>
                        </Box>
                    ) : loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>
                    ) : groupedReceipts.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                            <Typography variant="h6">Nu s-au găsit date pentru selecția curentă.</Typography>
                        </Box>
                    ) : (
                        groupedReceipts.map(group => (
                            <Paper key={group.date} elevation={2} sx={{ mb: 1, overflow: 'hidden', borderRadius: 2, border: '1px solid #eee' }}>
                                <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                                    <AccordionSummary 
                                        expandIcon={<ExpandMoreIcon />} 
                                        sx={{ 
                                            minHeight: 52, 
                                            bgcolor: '#fff', 
                                            '&.Mui-expanded': { borderBottom: '1px solid #f0f0f0', minHeight: 52 },
                                            '& .MuiAccordionSummary-content': { m: 0 } 
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" sx={{ mr: 2 }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <CalendarTodayIcon fontSize="small" color="action" />
                                                <Typography fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
                                                    {dayjs(group.date).format('DD MMMM YYYY')}
                                                </Typography>
                                                <Chip label={`${group.count} bonuri`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                                            </Stack>
                                            <Typography fontWeight="bold" color="primary.main" variant="h6">
                                                {group.total.toLocaleString('ro-RO')} RON
                                            </Typography>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>ORA</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>ID</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>MASĂ/DESTINAȚIE</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>CASIER</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>VALOARE</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>DETALII</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {group.items.map(r => (
                                                        <TableRow key={r.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ py: 1 }}>{dayjs(r.closedAt || r.createdAt).format('HH:mm')}</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>#{r.id}</TableCell>
                                                            <TableCell>
                                                                {r.originalReceiptId ? (
                                                                    <Box component="span">
                                                                        {r.tableName.split(`#${r.originalReceiptId}`)[0]}
                                                                        <Box 
                                                                            component="span" 
                                                                            onClick={() => openReceipt(r.originalReceiptId)}
                                                                            sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                                                                        >
                                                                            #{r.originalReceiptId}
                                                                        </Box>
                                                                        {r.tableName.split(`#${r.originalReceiptId}`)[1]}
                                                                    </Box>
                                                                ) : r.tableName}
                                                            </TableCell>
                                                            <TableCell>{r.userName}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: r.originalReceiptId ? 'error.main' : 'inherit' }}>
                                                                {r.totalAmount?.toLocaleString('ro-RO')} RON
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <IconButton size="small" onClick={() => openReceipt(r.id)}>
                                                                    <InfoIcon fontSize="small" color="primary" />
                                                                </IconButton>
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

                <ReceiptDetailModal 
                    open={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    receipt={selectedReceipt} 
                    onOpenOther={openReceipt}
                />
            </Box>
        </LocalizationProvider>
    );
};

export default Receipts;