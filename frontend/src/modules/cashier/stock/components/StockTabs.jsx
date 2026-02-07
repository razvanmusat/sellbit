import React from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';

// ICONS
import EditNoteIcon from '@mui/icons-material/EditNote';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import TouchAppIcon from '@mui/icons-material/TouchApp'; 
import AdsClickIcon from '@mui/icons-material/AdsClick'; 

// Componente Comune
import WarehouseTabs from '../../sales/components/common/WarehouseTabs';

// Componentele celor 3 Tab-uri
import StockAdjustmentTab from '../pages/StockAdjustmentPage';
import StockSearchPage from '../pages/StockSearchPage';
import StockCatalogTab from '../pages/StockCatalogPage';

// Hook-ul nou
import { useStockTabs } from '../hooks/useStockTabs';

const StockTabs = () => {
  const {
    warehouses,
    loading,
    activeTab,
    selectedWarehouseId,
    handleWarehouseChange,
    handleTabChange
  } = useStockTabs();

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