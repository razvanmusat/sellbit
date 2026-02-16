import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

const CatalogTabs = ({ activeTab, onTabChange }) => {
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
                <Tab label="Categorii & Produse" />
                <Tab label="Meniuri Compuse"/> 
            </Tabs>
        </Box>
    );
};

export default CatalogTabs;