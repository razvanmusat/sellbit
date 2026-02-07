import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Paper, CircularProgress } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import TouchAppIcon from '@mui/icons-material/TouchApp'; 
import AdsClickIcon from '@mui/icons-material/AdsClick'; 
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashierWarehouses } from '../store/cashierSlice';

import WarehouseTabs from '../../sales/components/common/WarehouseTabs';
import CashDrawerPage from '../pages/CashDrawerPage';
import CashMovementHistory from '../pages/CashMovementHistory';
import RefundPage from '../pages/RefundPage';
import SellReports from '../pages/SellReports';

const CashierReportsTabs = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  const { warehouses, loading } = useSelector((state) => state.cashier);
  const [activeTab, setActiveTab] = useState(currentTab || false); 
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(false);

  // Cheie unică pentru a forța re-randarea completă (Refresh)
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
      // Refresh la intrarea pe pagină sau schimbare URL
      setRefreshKey(prev => prev + 1);
    } else {
      setActiveTab(false);
      setSelectedWarehouseId(false);
    }
  }, [currentTab]);

  // Funcție dedicată pentru click (merge și pe tab-ul activ)
  const handleForceRefresh = () => {
      setRefreshKey(prev => prev + 1);
  };

  const handleWarehouseChange = (event, newValue) => {
    setSelectedWarehouseId(newValue);
    handleForceRefresh();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue) {
        setSearchParams({ tab: newValue });
    }
    // Nota: onChange nu se apelează dacă dai click pe tab-ul deja activ
    // De aceea folosim onClick direct pe <Tab> mai jos
  };

  if (loading && warehouses.length === 0) {
    return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

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
          {/* MODIFICARE CRITICĂ: 
             Am adăugat onClick={handleForceRefresh} pe fiecare Tab.
             Asta capturează click-ul CHIAR DACĂ ești deja pe tab-ul respectiv.
          */}
          <Tab 
            label="Sertar Bani" 
            value="drawer" 
            icon={<SavingsIcon />} 
            iconPosition="start" 
            onClick={handleForceRefresh} 
          />
          <Tab 
            label="Istoric Numerar" 
            value="history" 
            icon={<HistoryIcon />} 
            iconPosition="start" 
            onClick={handleForceRefresh}
          />
          <Tab 
            label="Retur / Stornare" 
            value="refund" 
            icon={<AssignmentReturnIcon />} 
            iconPosition="start" 
            onClick={handleForceRefresh}
          />
          <Tab 
            label="Rapoarte Casierie" 
            value="reports" 
            icon={<AssessmentIcon />} 
            iconPosition="start" 
            onClick={handleForceRefresh}
          />
        </Tabs>
      </Box>

      {/* ZONA 3: CONȚINUT */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        
        {!selectedWarehouseId ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="60%" gap={2}>
                <TouchAppIcon sx={{ fontSize: 60, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                    1. Selectează o <b>Gestiune</b> de sus.
                </Typography>
            </Box>
        ) : !activeTab ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="60%" gap={2}>
                <AdsClickIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.7 }} />
                <Typography variant="h6" color="text.secondary">
                    2. Acum selectează o opțiune: <b>Sertar</b>, <b>Retur</b> sau <b>Rapoarte</b>.
                </Typography>
            </Box>
        ) : (
            // Aici key={refreshKey} face magia: distruge și recreează componenta la fiecare click
            <>
                {activeTab === 'drawer' && (
                    <CashDrawerPage key={refreshKey} warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'history' && (
                    <CashMovementHistory key={refreshKey} warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'refund' && (
                    <RefundPage key={refreshKey} warehouseId={selectedWarehouseId} />
                )}

                {activeTab === 'reports' && (
                    <SellReports 
                        key={refreshKey} 
                        warehouseId={selectedWarehouseId}
                        warehouseName={selectedWarehouse?.name || 'Gestiune'}
                    />
                )}
            </>
        )}
      </Box>

    </Box>
  );
};

export default CashierReportsTabs;