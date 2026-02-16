import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom'; // Folosim SearchParams pentru siguranță

import CatalogTabs from '../components/CatalogTabs';
import ProductCatalogPage from './ProductCatalogPage';
import ProductCompositePage from './ProductCompositePage'; 

import { initCatalog, fetchCompositeMenus } from '../store/catalogSlice';

const CatalogMainPage = () => {     
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch();

    // Citim tab-ul din URL, dacă nu există punem false (ecranul de start)
    const activeTabRaw = searchParams.get('tab');
    const activeTab = activeTabRaw !== null ? parseInt(activeTabRaw, 10) : false;

    useEffect(() => {
        dispatch(initCatalog());
        dispatch(fetchCompositeMenus());
    }, [dispatch]);

    const handleTabChange = (event, newValue) => {
        // Actualizăm URL-ul cu ?tab=X fără să reîncărcăm pagina sau să riscăm redirect
        setSearchParams({ tab: newValue });
    };

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CatalogTabs activeTab={activeTab} onTabChange={handleTabChange} />

            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                
                {activeTab === false && (
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: 'text.secondary'
                    }}>
                        <Typography variant="h6">
                            Selectează o opțiune de mai sus pentru a continua.
                        </Typography>
                    </Box>
                )}

                {activeTab === 0 && <ProductCatalogPage />}
                {activeTab === 1 && <ProductCompositePage />}
            </Box>
        </Box>
    );
};

export default CatalogMainPage;