import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

const InventoryTabs = ({ activeTab, onTabChange }) => {
    return (        
        <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
                value={activeTab} 
                onChange={onTabChange} 
                indicatorColor="primary" 
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                {/* Corespunde PurchaseService */}
                <Tab label="Achiziții" />
                
                {/* Corespunde StockAdjustmentService */}
                <Tab label="Ajustări Stoc" />
                
                {/* Corespunde StockCurrentService */}
                <Tab label="Inventar" />
            </Tabs>
        </Box>
    );
};

export default InventoryTabs;