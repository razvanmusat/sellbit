import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

const CateringTabs = ({ activeTab, onTabChange }) => {
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
                <Tab label="Raport Comenzi" />
                <Tab label="Procesare Plată" /> 
                <Tab label="Istoric Plăți" /> 
            </Tabs>
        </Box>
    );
};

export default CateringTabs;