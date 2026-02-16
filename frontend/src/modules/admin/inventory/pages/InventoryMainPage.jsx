import React from 'react';
import { Box, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom'; // 1. IMPORTĂM HOOK-UL

import InventoryTabs from '../components/InventoryTabs';
import PurchaseMainPage from './PurchaseMainPage';
import AdjustmentMainPage from './AdjustmentMainPage';
import InventoryCountMainPage from './InventoryCountMainPage';

const StockTab = () => <Box p={2}><Typography>Modul Inventar Scriptic/Faptic (În lucru)</Typography></Box>;

const InventoryMainPage = () => {    
    // 2. FOLOSIM URL PARAMS ÎN LOC DE STATE
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Citim valoarea din URL. Dacă nu există, e false (niciun tab selectat)
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam !== null ? Number(tabParam) : false;

    const handleTabChange = (event, newValue) => {
        // 3. ACTUALIZĂM URL-UL PĂSTRÂND CEILALȚI PARAMETRI (ex: warehouseId)
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', newValue);
        setSearchParams(newParams);
    };

    return (
        <Box sx={{ 
            p: { xs: 0, sm: 2 }, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            
            <InventoryTabs activeTab={activeTab} onTabChange={handleTabChange} />

            <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                scrollbarGutter: 'stable',
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' },
                '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
            }}>
                
                {activeTab === false && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                        <Typography variant="h6">Selectează o opțiune de mai sus pentru a continua.</Typography>
                    </Box>
                )}

                {/* Rutează către componente în funcție de parametrul din URL */}
                {activeTab === 0 && <PurchaseMainPage />}
                {activeTab === 1 && <AdjustmentMainPage />}
                {activeTab === 2 && <InventoryCountMainPage />}
            </Box>
        </Box>
    );
};

export default InventoryMainPage;