import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Paper, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck'; 
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'; 
import StoreIcon from '@mui/icons-material/Store';

import { WarehouseService } from '../../../cashier/sales/api/WarehouseService';
import WarehouseTabs from '../../../cashier/sales/components/common/WarehouseTabs';

// Importăm noile componente
import InventoryPrintList from '../components/InventoryPrintList';
import InventoryOperation from '../components/InventoryOperation';

const InventoryCountMainPage = () => {
    // --- STATE GESTIUNI ---
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWh, setLoadingWh] = useState(false);
    
    // --- URL PARAMS ---
    const [searchParams, setSearchParams] = useSearchParams();
    const warehouseParam = searchParams.get('warehouseId');
    const selectedWarehouseId = warehouseParam ? Number(warehouseParam) : null;
    
    // SubTab Local: 0 = Print, 1 = Operare
    const [subTab, setSubTab] = useState(0); 

    // Încărcare Gestiuni
    useEffect(() => {
        let isMounted = true;
        setLoadingWh(true);
        WarehouseService.getActiveWarehouses()
            .then(data => { if (isMounted) setWarehouses(data || []); })
            .finally(() => { if (isMounted) setLoadingWh(false); });
        return () => { isMounted = false; };
    }, []);

    const handleWarehouseChange = (e, newId) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('warehouseId', newId);
        setSearchParams(newParams);
    };

    // Helper pentru numele gestiunii curente (pt header-ul de print)
    const currentWarehouseName = warehouses.find(w => w.id === selectedWarehouseId)?.name || '';

    if (loadingWh) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* ZONA GESTIUNI (No Print) */}
            <Box className="no-print">
                <WarehouseTabs 
                    warehouses={warehouses} 
                    selectedWarehouseId={selectedWarehouseId || false} 
                    onWarehouseChange={handleWarehouseChange} 
                />
            </Box>

            {!selectedWarehouseId ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary', opacity: 0.7, mt: 4 }}>
                    <StoreIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
                    <Typography variant="h6">👆 Alege gestiunea pentru Inventar.</Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mt: 1 }}>
                    
                    {/* TABURI NAVIGARE (No Print) */}
                    <Paper className="no-print" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', px: 1, bgcolor: 'transparent' }}>
                        <Tabs 
                            value={subTab} 
                            onChange={(e, v) => setSubTab(v)} 
                            indicatorColor="primary" 
                            textColor="primary"
                        >
                            <Tab icon={<FactCheckIcon />} iconPosition="start" label="Listă Printare" />
                            <Tab icon={<PlaylistAddCheckIcon />} iconPosition="start" label="Operare Faptic" />
                        </Tabs>
                    </Paper>

                    {/* CONTENT AREA */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 0, mt: 2 }}>
                        {subTab === 0 && (
                            <InventoryPrintList 
                                warehouseId={selectedWarehouseId} 
                                warehouseName={currentWarehouseName} 
                            />
                        )}
                        {subTab === 1 && (
                            <InventoryOperation 
                                warehouseId={selectedWarehouseId} 
                            />
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default InventoryCountMainPage;