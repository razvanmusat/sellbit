import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

import CatalogTabs from '../components/CatalogTabs';
import ProductCatalogPage from './ProductCatalogPage';

const CatalogMainPage = () => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        
        <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Taburile (acum au spatiu sub ele datorita mb:2 din componenta) */}
            <CatalogTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Continutul */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 0 && (
                    <ProductCatalogPage />
                )}
                
                {activeTab === 1 && (
                    <Box p={3}><Typography>În lucru...</Typography></Box>
                )}
            </Box>
        </Box>
    );
};

export default CatalogMainPage;