import React, { useEffect } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, Stack, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Button, MenuItem, TextField, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // Iconita noua pt zi
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

// Importăm hook-ul custom
import { useAdjustmentReport } from '../hooks/useAdjustmentReport';

const AdjustmentReport = ({ warehouseId }) => {
    
    const {
        isMobile,
        startDate, setStartDate,
        endDate, setEndDate,
        rawData,
        loading,
        error,
        dailyGroups, // FOLOSIM NOUA GRUPARE
        fetchReport,
        reasons,
        filterReason,
        setFilterReason
    } = useAdjustmentReport(warehouseId);

    useEffect(() => {
        fetchReport();
    }, [warehouseId, startDate, endDate]); 

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ p: isMobile ? 1 : 2, bgcolor: '#f8f9fa', minHeight: '100%' }}>
                
                {/* FILTRE */}
                <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: 'center', justifyContent: 'space-between', borderRadius: 2 }}>
                    <Stack direction={isMobile ? 'column' : 'row'} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
                        <DatePicker 
                            label="Din" 
                            value={startDate} 
                            onChange={setStartDate} 
                            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} 
                            format="DD/MM/YYYY" 
                        />
                        <DatePicker 
                            label="Până" 
                            value={endDate} 
                            onChange={setEndDate} 
                            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} 
                            format="DD/MM/YYYY" 
                        />
                        <Button variant="contained" onClick={fetchReport} sx={{ minWidth: 45 }}>
                            <SearchIcon /> Afișează
                        </Button>
                        <TextField
                            select
                            label="Filtrare Motiv"
                            size="small"
                            value={filterReason}
                            onChange={(e) => setFilterReason(e.target.value)}
                            sx={{ minWidth: 180, bgcolor: 'white' }}
                        >
                            <MenuItem value="ALL"><em>Toate Motivele</em></MenuItem>
                            {reasons.map((r) => (
                                <MenuItem key={r.id} value={r.label}>{r.label}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                    <Box sx={{ textAlign: isMobile ? 'center' : 'right' }}>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>TOTAL OPERAȚIUNI</Typography>
                        <Typography variant="h5" color="primary" sx={{ fontWeight: 900 }}>
                            {rawData.length} <small>linii</small>
                        </Typography>
                    </Box>
                </Paper>

                {/* CONTENT LIST */}
                {loading && rawData.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                ) : dailyGroups.length === 0 ? (
                    <Alert severity="info">Nu există ajustări conform filtrelor.</Alert>
                ) : (
                    // 1. ITERĂM PRIN ZILE
                    dailyGroups.map((dayGroup) => (
                        <Box key={dayGroup.date} sx={{ mb: 4 }}>
                            
                            {/* HEADER ZI */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, pl: 1 }}>
                                <CalendarTodayIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1.2rem' }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'capitalize' }}>
                                    {dayGroup.label}
                                </Typography>
                                <Divider sx={{ flex: 1, ml: 2, borderColor: 'rgba(0,0,0,0.08)' }} />
                            </Box>

                            {/* 2. ITERĂM PRIN OPERAȚIUNILE DIN ACEA ZI (Acordeoanele) */}
                            {dayGroup.operations.map((opGroup) => (
                                <Paper key={opGroup.id} elevation={2} sx={{ mb: 1, overflow: 'hidden', borderRadius: 2, border: '1px solid #eee' }}>
                                    <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                                        <AccordionSummary 
                                            expandIcon={<ExpandMoreIcon />} 
                                            sx={{ 
                                                minHeight: 52, 
                                                bgcolor: '#fff',
                                                '&.Mui-expanded': { borderBottom: '1px solid #f0f0f0' },
                                                '& .MuiAccordionSummary-content': { m: 0 }
                                            }}
                                        >
                                            <Stack direction={isMobile ? 'column' : 'row'} spacing={isMobile ? 0.5 : 3} sx={{ width: '100%', alignItems: isMobile ? 'flex-start' : 'center' }}>
                                                
                                                {/* DATA (ORA) & USER */}
                                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 170 }}>
                                                    <HistoryIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                                    <Box>
                                                        {/* Afișăm doar ORA, că data e sus */}
                                                        <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                                            {dayjs(opGroup.adjustedAt).format('HH:mm')}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                                            {opGroup.userName || 'Utilizator'}
                                                        </Typography>
                                                    </Box>
                                                </Stack>

                                                {/* MOTIV */}
                                                <Typography variant="body2" sx={{ flex: 1, color: 'text.primary', fontWeight: 500 }}>
                                                    Motiv: <strong>{opGroup.reasonLabel}</strong>
                                                </Typography>

                                                {/* TOTAL ITEMS */}
                                                <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: isMobile ? 0 : 'auto', pr: 1 }}>
                                                    <Typography variant="caption" sx={{ bgcolor: '#f5f5f5', px: 1, py: 0.2, borderRadius: 1, color: 'text.secondary', border: '1px solid #eee' }}>
                                                        {opGroup.items.length} produse
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </AccordionSummary>
                                        
                                        <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', py: 1 }}>PRODUS</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>NOTĂ</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>AJUSTARE</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {opGroup.items.map((item) => {
                                                            const isPositive = item.quantityChange > 0;
                                                            return (
                                                                <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                                    <TableCell sx={{ fontWeight: 600, py: 0.8 }}>{item.productName}</TableCell>
                                                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                                                        {item.note || '-'}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ 
                                                                        fontWeight: 800, 
                                                                        color: isPositive ? 'success.main' : 'error.main' 
                                                                    }}>
                                                                        {isPositive ? '+' : ''}{Number(item.quantityChange).toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </AccordionDetails>
                                    </Accordion>
                                </Paper>
                            ))}
                        </Box>
                    ))
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default AdjustmentReport;