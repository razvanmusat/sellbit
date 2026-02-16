import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

// Importuri Redux
import { useDispatch, useSelector } from 'react-redux';
import { fetchPurchaseReport } from '../store/purchasePageSlice'; 

import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import StoreIcon from '@mui/icons-material/Store';

import { WarehouseService } from '../../../cashier/sales/api/WarehouseService';
import WarehouseTabs from '../../../cashier/sales/components/common/WarehouseTabs';
import StockInForm from '../components/StockInForm'; 
import PurchaseReport from '../components/PurchaseReport';
import ProductAudit from '../components/ProductAudit';

const PurchaseMainPage = () => {
    // State local doar pentru datele API (gestiuni)
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(false);
    const [error, setError] = useState(null);

    // Hooks Redux
    const dispatch = useDispatch();
    const { startDate, endDate } = useSelector(state => state.purchasePage);

    // URL PARAMS
    const [searchParams, setSearchParams] = useSearchParams();

    const warehouseParam = searchParams.get('warehouseId');
    const selectedWarehouseId = warehouseParam ? Number(warehouseParam) : null;

    const subTabParam = searchParams.get('subTab');
    const subTab = subTabParam ? Number(subTabParam) : 0;

    // 1. Încărcare Gestiuni
    useEffect(() => {
        let isMounted = true;
        setLoadingWarehouses(true);
        WarehouseService.getActiveWarehouses()
            .then(data => { if (isMounted) setWarehouses(data || []); })
            .catch(err => { if (isMounted) setError("Eroare la încărcare gestiuni."); })
            .finally(() => { if (isMounted) setLoadingWarehouses(false); });
        return () => { isMounted = false; };
    }, []);
    
    useEffect(() => {
        if (selectedWarehouseId) {            
            
            dispatch(fetchPurchaseReport({ 
                startDate, 
                endDate, 
                warehouseId: selectedWarehouseId 
            }));
        }
    }, [selectedWarehouseId, subTab, startDate, endDate, dispatch]); 
    // ^^^ AICI este cheia: am adăugat 'subTab', 'startDate' și 'endDate'

    // 3. Update URL la schimbare gestiune
    const handleWarehouseChange = (event, newId) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('warehouseId', newId);
        setSearchParams(newParams);
    };

    // 4. Update URL la schimbare sub-tab
    const handleSubTabChange = (event, newIndex) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('subTab', newIndex);
        setSearchParams(newParams);
    };

    if (loadingWarehouses) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            <WarehouseTabs 
                warehouses={warehouses} 
                selectedWarehouseId={selectedWarehouseId || false} 
                onWarehouseChange={handleWarehouseChange} 
            />

            {!selectedWarehouseId ? (
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
                        {subTab === 0 && <StockInForm warehouseId={selectedWarehouseId} />}
                        {subTab === 1 && <PurchaseReport warehouseId={selectedWarehouseId} />}
                        {subTab === 2 && <ProductAudit warehouseId={selectedWarehouseId} />}                        
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default PurchaseMainPage;