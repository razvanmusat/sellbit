import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Paper, CircularProgress } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

// ICONS
import EditNoteIcon from '@mui/icons-material/EditNote'; // Pt Ajustări
import SearchIcon from '@mui/icons-material/Search'; // Pt Căutare
import CategoryIcon from '@mui/icons-material/Category'; // Pt Catalog
import TouchAppIcon from '@mui/icons-material/TouchApp'; 
import AdsClickIcon from '@mui/icons-material/AdsClick'; 

// REDUX
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashierWarehouses } from '../../cashierReports/store/cashierSlice';

// Componente Comune
import WarehouseTabs from '../../sales/components/common/WarehouseTabs';

// Componentele celor 3 Tab-uri (Create la Pasul 1)
import StockAdjustmentTab from '../pages/StockAdjustmentPage';
import StockSearchPage from '../pages/StockSearchPage';
import StockCatalogTab from '../pages/StockCatalogPage';

const StockTabs = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  // --- 1. DATE DIN REDUX (CACHE) ---
  // Reutilizăm slice-ul cashier existent
  const { warehouses, loading } = useSelector((state) => state.cashier);

  // --- 2. STARE LOCALĂ ---
  const [activeTab, setActiveTab] = useState(currentTab || false); 
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(false);

  // --- 3. FETCH LA MONTARE ---
  useEffect(() => {
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  // Sincronizare URL
  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
    } else {
      setActiveTab(false);
      setSelectedWarehouseId(false);
    }
  }, [currentTab]);

  // --- HANDLERS ---
  const handleWarehouseChange = (event, newValue) => {
    setSelectedWarehouseId(newValue);
    // Opțional: Resetăm tab-ul când schimbă gestiunea, sau îl lăsăm activ
    // setActiveTab(false); 
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue) {
        setSearchParams({ tab: newValue });
    }
  };

  if (loading && warehouses.length === 0) {
    return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* ZONA 1: TABURI GESTIUNI */}
      <Box sx={{ mb: 2 }}>
        <WarehouseTabs 
            warehouses={warehouses} 
            selectedWarehouseId={selectedWarehouseId} 
            onWarehouseChange={handleWarehouseChange} 
        />
      </Box>

      {/* ZONA 2: TABURI ACȚIUNI STOC */}
      <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab 
            label="Ajustări Stoc" 
            value="adjustments" 
            icon={<EditNoteIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Căutare Rapidă" 
            value="search" 
            icon={<SearchIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Catalog Produse" 
            value="catalog" 
            icon={<CategoryIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Box>

      {/* ZONA 3: CONȚINUT */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        
        {/* LOGICA DE AFISARE */}
        {!selectedWarehouseId ? (
            <Box 
              display="flex" flexDirection="column" justifyContent="center" alignItems="center" 
              height="60%" gap={2}
            >
                <TouchAppIcon sx={{ fontSize: 60, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                    1. Selectează o <b>Gestiune</b> de sus pentru a verifica stocul.
                </Typography>
            </Box>
        ) : !activeTab ? (
            <Box 
              display="flex" flexDirection="column" justifyContent="center" alignItems="center" 
              height="60%" gap={2}
            >
                <AdsClickIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.7 }} />
                <Typography variant="h6" color="text.secondary">
                    2. Ce dorești să faci? Selectează o opțiune de mai sus.
                </Typography>
            </Box>
        ) : (
            <>
                {activeTab === 'adjustments' && (
                    <StockAdjustmentTab warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'search' && (
                    <StockSearchPage warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'catalog' && (
                    <StockCatalogTab warehouseId={selectedWarehouseId} />
                )}
            </>
        )}
      </Box>

    </Box>
  );
};

export default StockTabs;