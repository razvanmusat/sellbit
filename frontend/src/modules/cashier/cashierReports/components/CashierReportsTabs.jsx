import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tabs, Tab, CircularProgress } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

import { fetchCashierWarehouses } from '../store/cashierSlice';
import { invalidateCache } from '../store/sellReportsSlice';

import CashDrawerPage from '../pages/CashDrawerPage';
import CashMovementHistory from '../pages/CashMovementHistory';
import RefundPage from '../pages/RefundPage';
import SellReports from '../pages/SellReports';

const CashierReportsTabs = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { warehouses, loading } = useSelector((state) => state.cashier);

  // Excludem gestiunea GP din UI
  const filteredWarehouses = warehouses.filter(w => w.code !== 'GP');

  const currentTab = searchParams.get('tab') || 'drawer';
  const [activeTab, setActiveTab] = useState(currentTab);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);

  // Invalidare cache la click pe linkul principal de cashier
  useEffect(() => {
    const handleHomeClick = (e) => {
      if (e.target.closest('a[href="/home/cashier"]')) {
        dispatch(invalidateCache());
      }
    };
    window.addEventListener('click', handleHomeClick);
    return () => window.removeEventListener('click', handleHomeClick);
  }, [dispatch]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue }, { replace: true });
    setRefreshKey(prev => prev + 1);
  };

  if (loading && warehouses.length === 0) {
    return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* TABURI PRINCIPALE */}
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
          <Tab label="Rapoarte Casierie" value="reports" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Istoric Numerar" value="history" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Retur / Stornare" value="refund" icon={<AssignmentReturnIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* CONȚINUT — fiecare pagină gestionează intern selectorul de gestiune */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'drawer' && (
          <CashDrawerPage key={refreshKey} warehouses={filteredWarehouses} />
        )}
        {activeTab === 'reports' && (
          <SellReports key={refreshKey} warehouses={filteredWarehouses} />
        )}
        {activeTab === 'history' && (
          <CashMovementHistory key={refreshKey} warehouses={filteredWarehouses} />
        )}
        {activeTab === 'refund' && (
          <RefundPage key={refreshKey} warehouses={filteredWarehouses} />
        )}
      </Box>
    </Box>
  );
};

export default CashierReportsTabs;