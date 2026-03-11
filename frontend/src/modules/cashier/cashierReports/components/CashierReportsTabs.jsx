import React, { useState, useEffect, useCallback } from 'react';
import { invalidateCache } from '../store/sellReportsSlice';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
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

const TAB_PARAM_KEYS = {
  drawer: ['tab', 'warehouseId'],
  history: ['tab', 'warehouseId', 'startDate', 'endDate', 'type'],
  refund: ['tab', 'warehouseId', 'date'],
  reports: ['tab', 'warehouseId', 'date'],
};

const CashierReportsTabs = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const warehouseIdParam = searchParams.get('warehouseId');  
  const { warehouses, loading } = useSelector((state) => state.cashier);
  // Filtrare: excludem gestiunea cu codul "GP"
  const filteredWarehouses = warehouses.filter(w => w.code !== "GP");
  const [activeTab, setActiveTab] = useState(currentTab || false); 
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouseIdParam ? Number(warehouseIdParam) : false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  useEffect(() => {
    setActiveTab(currentTab || false);
    setSelectedWarehouseId(warehouseIdParam ? Number(warehouseIdParam) : false);
    setRefreshKey(prev => prev + 1);
  }, [currentTab, warehouseIdParam]);

  // Reconstruiește complet URL-ul păstrând TOȚI parametrii existenți (fără filtrare pe tab)
  const buildParams = useCallback((tab, warehouseId, prevParams) => {
    // Păstrează DOAR parametrii specifici tabului țintă
    const params = new URLSearchParams();
    const keys = TAB_PARAM_KEYS[tab] || [];
    for (const key of keys) {
      if (key === 'tab' && tab) params.set('tab', tab);
      else if (key === 'warehouseId' && warehouseId) params.set('warehouseId', warehouseId);
      else if (prevParams.has(key)) params.set(key, prevParams.get(key));
    }
    return params;
  }, []);

  // Schimbare warehouse: reconstruiește linkul cu tabul curent și warehouse nou, păstrând DOAR filtrele tabului curent
  const handleWarehouseChange = (event, newValue) => {
    setSelectedWarehouseId(newValue);
    let params = buildParams(activeTab, newValue, searchParams);
    // Păstrează explicit refundDate/reportDate dacă există în URL
    if (searchParams.get('refundDate')) {
      params.set('refundDate', searchParams.get('refundDate'));
    }
    if (searchParams.get('reportDate')) {
      params.set('reportDate', searchParams.get('reportDate'));
    }
    setSearchParams(params, { replace: true });
    setRefreshKey(prev => prev + 1);
  };

  // Schimbare tab: reconstruiește linkul cu warehouseId și tab nou, păstrând DOAR filtrele tabului nou
  const handleTabChange = (event, newValue) => {
    let params = buildParams(newValue, selectedWarehouseId, searchParams);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (newValue === 'refund') {
      params.delete('reportDate');
      if (!params.get('refundDate')) {
        params.set('refundDate', `${yyyy}-${mm}-${dd}`);
      }
    } else if (newValue === 'reports') {
      params.delete('refundDate');
      if (!params.get('reportDate')) {
        params.set('reportDate', `${yyyy}-${mm}-${dd}`);
      }
    } else {
      params.delete('refundDate');
      params.delete('reportDate');
    }
    setSearchParams(params, { replace: true });
    setRefreshKey(prev => prev + 1);
  };

  // Dacă nu există tab selectat, warehouseId se pune singur în URL
  const handleWarehouseOnly = (event, newValue) => {
    setSelectedWarehouseId(newValue);
    const params = new URLSearchParams();
    params.set('warehouseId', newValue);
    setSearchParams(params, { replace: true });
    setRefreshKey(prev => prev + 1);
  };

  // La click pe logo sau pe linkul principal de cashier, invalidează tot cache-ul rapoartelor
  useEffect(() => {
    const handleHomeClick = (e) => {
      // Verifică dacă se apasă pe linkul către /home/cashier
      if (e.target.closest('a[href="/home/cashier"]')) {
        dispatch(invalidateCache());
      }
    };
    window.addEventListener('click', handleHomeClick);
    return () => window.removeEventListener('click', handleHomeClick);
  }, [dispatch]);

  if (loading && warehouses.length === 0) {
    return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  const selectedWarehouse = filteredWarehouses.find(w => w.id === selectedWarehouseId);

  return (
    <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* ZONA 1: TABURI GESTIUNI */}
      <Box sx={{ mb: 2 }}>
        <WarehouseTabs 
            warehouses={filteredWarehouses} 
            selectedWarehouseId={selectedWarehouseId} 
            onWarehouseChange={activeTab ? handleWarehouseChange : handleWarehouseOnly} 
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
          />
          <Tab 
            label="Rapoarte Casierie" 
            value="reports" 
            icon={<AssessmentIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Istoric Numerar" 
            value="history" 
            icon={<HistoryIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Retur / Stornare" 
            value="refund" 
            icon={<AssignmentReturnIcon />} 
            iconPosition="start" 
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
                  Selectează o opțiune
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