import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, Stack, CircularProgress, Alert, Grid, Card, CardContent, Snackbar 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

import { SalesService } from '../api/SalesService';
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

const ProfitStats = ({ warehouseId, warehouseName }) => {
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());
    const [totalProfit, setTotalProfit] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        if (!warehouseId) {
            return;
        }

        const unsubscribe = onSalesDataChanged(() => {
            setRefreshTick((value) => value + 1);
        });

        return unsubscribe;
    }, [warehouseId]);

    useEffect(() => {
        const fetchProfitData = async () => {
            if (!warehouseId) return;
            
            // Auto-swapt daca start > end
            let start = startDate;
            let end = endDate;
            
            if (start.isAfter(end)) {
                [start, end] = [end, start];
            }
            
            setLoading(true);
            setError(null);
            try {
                const params = {
                    warehouseId,
                    start: start.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                    end: end.endOf('day').format('YYYY-MM-DDTHH:mm:ss')
                };

                const total = await SalesService.getGrossProfit(params);
                setTotalProfit(typeof total === 'number' ? total : 0);
            } catch (err) {
                setError("Eroare la încărcarea datelor.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfitData();
    }, [warehouseId, startDate, endDate, refreshTick]);

    const getProfitColor = (value) => {
        if (value > 0) return 'success.main';
        if (value < 0) return 'error.main';
        return 'text.secondary';
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <Box sx={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 4,
                mt: 4
            }}>
                
                {/* Zona Calendare - Dimensiune fixa sa nu se miste */}
                <Box sx={{ minWidth: 500, display: 'flex', justifyContent: 'center' }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <DatePicker 
                                label="De la" 
                                value={startDate} 
                                onChange={(val) => setStartDate(val)} 
                                format="DD/MM/YYYY"
                                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} 
                            />
                            <DatePicker 
                                label="Până la" 
                                value={endDate} 
                                onChange={(val) => setEndDate(val)} 
                                format="DD/MM/YYYY"
                                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} 
                            />
                            <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                                {loading && <CircularProgress size={20} />}
                            </Box>
                        </Stack>
                    </Paper>
                </Box>

                {error && <Alert severity="error" sx={{ width: 500 }}>{error}</Alert>}

                {/* Cardul de Profit - Dimensiune fixa */}
                <Card variant="outlined" sx={{ 
                    width: 500, 
                    minHeight: 200,
                    borderRadius: 4, 
                    textAlign: 'center',
                    border: '1px solid #eef0f2',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <CardContent sx={{ p: 5 }}>                       
                        
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#000', mb: 1 }}>
                            Profit net (fara TVA)
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 2.5 }}>
                            {warehouseName || 'Gestiune necunoscută'}
                        </Typography>

                        <Box sx={{ mt: 2 }}>
                            <Typography 
                                variant="h2" 
                                sx={{ 
                                    fontWeight: 800, 
                                    color: getProfitColor(totalProfit),
                                    lineHeight: 1
                                }}
                            >
                                {totalProfit.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                <Typography component="span" variant="h4" sx={{ ml: 1.5, color: 'inherit', fontWeight: 500 }}>
                                    RON
                                </Typography>
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </LocalizationProvider>
    );
};

export default ProfitStats;