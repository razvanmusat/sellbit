import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Paper, CircularProgress } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import TouchAppIcon from '@mui/icons-material/TouchApp'; 
import AdsClickIcon from '@mui/icons-material/AdsClick'; 
import { useSearchParams } from 'react-router-dom';

// REDUX
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashierWarehouses } from '../store/cashierSlice';

// Componente
import WarehouseTabs from '../../sales/components/common/WarehouseTabs';
import CashDrawerPage from '../pages/CashDrawerPage';
import CashMovementHistory from '../pages/CashMovementHistory';

const CashierReportsTabs = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  // --- 1. DATE DIN REDUX (CACHE) ---
  // Luăm lista de gestiuni din Redux. 
  // Dacă am mai fost aici, lista e deja plină -> ZERO FLICKER.
  const { warehouses, loading } = useSelector((state) => state.cashier);

  // --- 2. STARE LOCALĂ (RESET AUTOMAT) ---
  // De fiecare dată când intri pe pagină, astea pornesc de la FALSE.
  const [activeTab, setActiveTab] = useState(currentTab || false); 
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(false);

  // --- 3. FETCH LA MONTARE ---
  useEffect(() => {
    // Declanșăm acțiunea. Thunk-ul din Redux e deștept:
    // Dacă are date, nu face nimic. Dacă n-are, le descarcă.
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  // Sincronizare URL (doar dacă dai refresh cu link direct)
  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
    } else {
      // Dacă nu e nimic în URL, ne asigurăm că e resetat
      setActiveTab(false);
      setSelectedWarehouseId(false);
    }
  }, [currentTab]);


  // --- HANDLERS ---
  const handleWarehouseChange = (event, newValue) => {
    setSelectedWarehouseId(newValue);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue) {
        setSearchParams({ tab: newValue });
    }
  };

  // Loading apare doar prima dată în viața aplicației, când Redux e gol
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

      {/* ZONA 2: TABURI PRINCIPALE */}
      <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Sertar Bani" value="drawer" icon={<SavingsIcon />} iconPosition="start" />
          <Tab label="Istoric Numerar" value="history" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Rapoarte Vânzări" value="reports" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ZONA 3: CONȚINUT */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        
        {/* LOGICA DE AFISARE "RESETATĂ" */}
        {!selectedWarehouseId ? (
            <Box 
              display="flex" flexDirection="column" justifyContent="center" alignItems="center" 
              height="60%" gap={2}
            >
                <TouchAppIcon sx={{ fontSize: 60, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                    1. Selectează o <b>Gestiune</b> de sus.
                </Typography>
            </Box>
        ) : !activeTab ? (
            <Box 
              display="flex" flexDirection="column" justifyContent="center" alignItems="center" 
              height="60%" gap={2}
            >
                <AdsClickIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.7 }} />
                <Typography variant="h6" color="text.secondary">
                    2. Acum selectează o opțiune: <b>Sertar</b>, <b>Istoric</b> sau <b>Rapoarte</b>.
                </Typography>
            </Box>
        ) : (
            <>
                {activeTab === 'drawer' && (
                    <CashDrawerPage warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'history' && (
                    <CashMovementHistory warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'reports' && (
                    <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px dashed #ccc' }}>
                        <Typography variant="h5">Zona Rapoarte</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Grafice pentru gestiunea ID: {selectedWarehouseId} (în lucru).
                        </Typography>
                    </Paper>
                )}
            </>
        )}
      </Box>

    </Box>
  );
};

export default CashierReportsTabs;