import React from 'react';
import { Box } from '@mui/material';
// Asigură-te că această cale e corectă (verifică folderul admin)
import InventoryPrintList from '../../../admin/inventory/components/InventoryPrintList';

const StockInventoryListPage = ({ warehouseId, warehouseName }) => {
    // Nu ai nevoie de useAuth, primești ID-ul direct de la StockTabs
    
    return (
        <Box sx={{ height: '100%' }}>
            <InventoryPrintList 
                warehouseId={warehouseId} 
                warehouseName={warehouseName} 
            />
        </Box>
    );
};

export default StockInventoryListPage;