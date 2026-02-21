import React from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

import TuneIcon from '@mui/icons-material/Tune'; 
import AssessmentIcon from '@mui/icons-material/Assessment'; 
import HistoryIcon from '@mui/icons-material/History'; 
import StoreIcon from '@mui/icons-material/Store';

import StockAdjustmentForm from '../components/StockAdjustmentForm'; 
import AdjustmentReport from '../components/AdjustmentReport';
import AdjustmentProductAudit from '../components/AdjustmentProductAudit';

const AdjustmentMainPage = ({ warehouseId, warehouseName }) => {
    // URL PARAMS (Doar pentru subTab)
    const [searchParams, setSearchParams] = useSearchParams();

    const subTabParam = searchParams.get('subTab');
    const subTab = subTabParam ? Number(subTabParam) : 0;

    const handleSubTabChange = (event, newIndex) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('subTab', newIndex);
        setSearchParams(newParams);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {!warehouseId ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary', opacity: 0.7, mt: 4 }}>
                    <StoreIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
                    <Typography variant="h6">👆 Alege o gestiune pentru a începe ajustările.</Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mt: 1 }}>
                    
                    <Paper elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', px: 1, bgcolor: 'transparent' }}>
                        <Tabs 
                            value={subTab} 
                            onChange={handleSubTabChange} 
                            indicatorColor="primary" 
                            textColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                        >
                            <Tab icon={<TuneIcon />} iconPosition="start" label="Operare Ajustare" />
                            <Tab icon={<AssessmentIcon />} iconPosition="start" label="Jurnal Ajustări" />
                            <Tab icon={<HistoryIcon />} iconPosition="start" label="Istoric Produs" />                            
                        </Tabs>
                    </Paper>

                    <Box sx={{ flex: 1, overflowY: 'auto', p: 0, mt: 2 }}>
                        {subTab === 0 && (
                            <StockAdjustmentForm 
                                warehouseId={warehouseId} 
                                warehouseName={warehouseName}
                            />
                        )}
                        {subTab === 1 && <AdjustmentReport warehouseId={warehouseId} />}
                        {subTab === 2 && <AdjustmentProductAudit warehouseId={warehouseId} />}                        
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default AdjustmentMainPage;