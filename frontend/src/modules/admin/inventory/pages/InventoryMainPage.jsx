import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

// Import Icons
import StoreIcon from '@mui/icons-material/Store';
import TouchAppIcon from '@mui/icons-material/TouchApp';

import InventoryTabs from '../components/InventoryTabs';
import { WarehouseService } from '../../../cashier/sales/api/WarehouseService';
import WarehouseTabs from '../../../cashier/sales/components/common/WarehouseTabs';

// Importăm paginile copil
import PurchaseMainPage from './PurchaseMainPage';
import AdjustmentMainPage from './AdjustmentMainPage';
import InventoryCountMainPage from './InventoryCountMainPage';

const InventoryMainPage = () => {    
    // 1. STATE & URL PARAMS
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Tab-ul principal (Achiziții, Ajustări, Inventar)
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam !== null ? Number(tabParam) : false;

    // Gestiunea selectată
    const warehouseParam = searchParams.get('warehouseId');
    const selectedWarehouseId = warehouseParam ? Number(warehouseParam) : null;

    // Date pentru gestiuni
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(false);
    const [error, setError] = useState(null);

    // 2. ÎNCĂRCARE GESTIUNI
    useEffect(() => {
        let isMounted = true;
        setLoadingWarehouses(true);
        WarehouseService.getActiveWarehouses()
            .then(data => { if (isMounted) setWarehouses(data || []); })
            .catch(err => { if (isMounted) setError("Eroare la încărcare gestiuni."); })
            .finally(() => { if (isMounted) setLoadingWarehouses(false); });
        return () => { isMounted = false; };
    }, []);

    // Helper: Găsim numele gestiunii selectate
    const selectedWarehouseName = warehouses.find(w => w.id === selectedWarehouseId)?.name || '';

    // 3. HANDLERS
    const handleTabChange = (event, newValue) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', newValue);
        setSearchParams(newParams);
    };

    const handleWarehouseChange = (event, newId) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('warehouseId', newId);
        setSearchParams(newParams);
    };

    // 4. RENDER
    if (loadingWarehouses) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;

    return (
        <Box sx={{ 
            p: { xs: 0, sm: 2 }, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            
            {/* A. SELECTOR GESTIUNE (SUS) */}
            <WarehouseTabs 
                warehouses={warehouses} 
                selectedWarehouseId={selectedWarehouseId || false} 
                onWarehouseChange={handleWarehouseChange} 
            />

            {/* B. TABURI PRINCIPALE (SUB GESTIUNI) */}
            <InventoryTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* C. CONȚINUT DINAMIC */}
            <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                scrollbarGutter: 'stable',
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' },
                '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
            }}>
                
                {/* LOGICA DE AFIȘARE MESAJ SAU CONȚINUT */}
                
                {!selectedWarehouseId ? (
                    // CAZ 1: Nu avem gestiune selectată
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', height: '100%', color: 'text.secondary', opacity: 0.7 }}>
                        <StoreIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
                        <Typography variant="h6">👆 Selectează o gestiune pentru a începe.</Typography>
                    </Box>
                ) : activeTab === false ? (
                    // CAZ 2: Avem gestiune, dar nu avem tab (modul) selectat
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', height: '100%', color: 'text.secondary', opacity: 0.7 }}>
                        <TouchAppIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
                        <Typography variant="h6">Selectează o opțiune (Achiziții, Ajustări sau Inventar) pentru a continua.</Typography>
                    </Box>
                ) : (
                    // CAZ 3: Avem tot ce trebuie, afișăm componenta
                    <>
                        {activeTab === 0 && (
                            <PurchaseMainPage 
                                warehouseId={selectedWarehouseId} 
                            />
                        )}
                        
                        {activeTab === 1 && (
                            <AdjustmentMainPage 
                                warehouseId={selectedWarehouseId} 
                                warehouseName={selectedWarehouseName} 
                            />
                        )}
                        
                        {activeTab === 2 && (
                            <InventoryCountMainPage 
                                warehouseId={selectedWarehouseId} 
                                warehouseName={selectedWarehouseName} 
                            />
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default InventoryMainPage;