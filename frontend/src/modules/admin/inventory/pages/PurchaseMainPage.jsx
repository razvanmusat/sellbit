import React, { useEffect } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

// Importuri Redux
import { useDispatch, useSelector } from 'react-redux';
import { fetchPurchaseReport } from '../store/purchasePageSlice'; 

import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import StoreIcon from '@mui/icons-material/Store';

import StockInForm from '../components/StockInForm'; 
import PurchaseReport from '../components/PurchaseReport';
import ProductAudit from '../components/ProductAudit';

const PurchaseMainPage = ({ warehouseId }) => {
    // Hooks Redux
    const dispatch = useDispatch();
    const { startDate, endDate } = useSelector(state => state.purchasePage);

    // URL PARAMS (Doar pentru subTab, warehouseId vine din props)
    const [searchParams, setSearchParams] = useSearchParams();

    const subTabParam = searchParams.get('subTab');
    const subTab = subTabParam ? Number(subTabParam) : 0;
    
    // 1. Fetch Report la schimbare gestiune/date/tab
    useEffect(() => {
        if (warehouseId) {            
            dispatch(fetchPurchaseReport({ 
                startDate, 
                endDate, 
                warehouseId: warehouseId 
            }));
        }
    }, [warehouseId, subTab, startDate, endDate, dispatch]); 

    // 2. Update URL la schimbare sub-tab
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
                    <Typography variant="h6">👆 Alege o gestiune pentru a începe.</Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mt: 1 }}>
                    
                    <Paper elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', px: 1, bgcolor: 'transparent' }}>
                        <Tabs 
                            value={subTab} 
                            onChange={handleSubTabChange} 
                            indicatorColor="secondary" 
                            textColor="secondary"
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                        >
                            <Tab icon={<AddShoppingCartIcon />} iconPosition="start" label="Recepție Marfă" />
                            <Tab icon={<AssessmentIcon />} iconPosition="start" label="Jurnal Achiziții" />
                            <Tab icon={<HistoryIcon />} iconPosition="start" label="Audit Produs" />                            
                        </Tabs>
                    </Paper>

                    <Box sx={{ flex: 1, overflowY: 'auto', p: 0, mt: 2 }}>
                        {subTab === 0 && <StockInForm warehouseId={warehouseId} />}
                        {subTab === 1 && <PurchaseReport warehouseId={warehouseId} />}
                        {subTab === 2 && <ProductAudit warehouseId={warehouseId} />}                        
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default PurchaseMainPage;