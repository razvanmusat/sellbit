import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

// Importăm acțiunea din Slice pentru Background Fetch
import { fetchCateringDashboardData } from '../store/cateringSlice';

import CateringTabs from '../components/CateringTabs';
import CateringOrdersReportTab from '../components/CateringOrdersReportTab';
import CateringPaymentTab from '../components/CateringPaymentTab';
import CateringHistoryTab from '../components/CateringHistoryTab';

const CateringMainPage = () => {    
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();

    // Citim tab-ul din URL. Dacă nu există, e false (sau null)
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam !== null ? parseInt(tabParam, 10) : false;

    // FETCH DATE (Background)
    useEffect(() => {
        dispatch(fetchCateringDashboardData());
    }, [dispatch]);

    const handleTabChange = (event, newValue) => {
        // Când schimbăm tab-ul, păstrăm datele curente în URL sau le putem șterge.
        // Pentru o experiență fluidă, de obicei e bine să păstrăm filtrele dacă e relevant, 
        // dar aici fiecare tab are propriile default-uri.
        // Totuși, hook-urile copiilor vor suprascrie datele dacă sunt incompatibile sau le vor citi pe cele existente.
        // Simplu: setăm noul tab în URL.
        const newParams = { ...Object.fromEntries(searchParams), tab: newValue };
        setSearchParams(newParams);
    };

    return (
        <Box sx={{ 
            p: { xs: 0, sm: 2 }, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            
            {/* Header Tabs */}
            <CateringTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Continutul - Scrollabil */}
            <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                scrollbarGutter: 'stable',
                '&::-webkit-scrollbar': {
                    width: '8px',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                }
            }}>
                
                {/* Mesaj de întâmpinare */}
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

                {/* Tab 0: Raport Comenzi */}
                {activeTab === 0 && (
                    <CateringOrdersReportTab />
                )}
                
                {/* Tab 1: Procesare Plată */}
                {activeTab === 1 && (
                    <CateringPaymentTab />
                )}

                {/* Tab 2: Istoric Plăți */}
                {activeTab === 2 && (
                    <CateringHistoryTab />
                )}
            </Box>
        </Box>
    );
};

export default CateringMainPage;