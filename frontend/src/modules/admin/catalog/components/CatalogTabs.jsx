import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

const CatalogTabs = ({ activeTab, onTabChange }) => {
    return (
        // SCHIMBARE: Folosim Box (transparent) in loc de Paper (alb cu umbra)
        // Adaugam mb: 2 pentru a crea spatiu intre taburi si continutul de jos
        <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
                value={activeTab} 
                onChange={onTabChange} 
                indicatorColor="primary" 
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab label="Gestionare Categorii & Produse" />
                <Tab label="Meniuri Compuse" disabled /> 
            </Tabs>
        </Box>
    );
};

export default CatalogTabs;