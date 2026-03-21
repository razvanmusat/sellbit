import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tabs, Tab, CircularProgress, Typography } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import TouchAppIcon from '@mui/icons-material/TouchApp';

import { fetchCashierWarehouses } from '../store/cashierSlice';
import { invalidateCache } from '../store/sellReportsSlice';

const TABS = [
  { value: 'drawer',  label: 'Sertar Bani',        icon: <SavingsIcon /> },
  { value: 'reports', label: 'Rapoarte Casierie',   icon: <AssessmentIcon /> },
  { value: 'history', label: 'Istoric Numerar',     icon: <HistoryIcon /> },
  { value: 'refund',  label: 'Retur / Stornare',   icon: <AssignmentReturnIcon /> },
];

const CashierMainPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { warehouses, loading } = useSelector((state) => state.cashier);

  useEffect(() => {
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  useEffect(() => {
    const handleHomeClick = (e) => {
      if (e.target.closest('a[href="/home/cashier"]')) {
        dispatch(invalidateCache());
      }
    };
    window.addEventListener('click', handleHomeClick);
    return () => window.removeEventListener('click', handleHomeClick);
  }, [dispatch]);

  // Detectează tab-ul activ din URL
  const activeTab = TABS.find(t => location.pathname.includes(t.value))?.value || false;

  const handleTabChange = (event, newValue) => {
    navigate(`/home/cashier/${newValue}`);
  };

  if (loading && warehouses.length === 0) {
    return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>

      <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {TABS.map(t => (
            <Tab key={t.value} label={t.label} value={t.value} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!activeTab ? (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 2, color: 'text.secondary',
          }}>
            <TouchAppIcon sx={{ fontSize: 56, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary">
              Selectează o secțiune din meniul de mai sus
            </Typography>
          </Box>
        ) : (
          <Outlet context={{ warehouses: warehouses.filter(w => w.code !== 'GP') }} />
        )}
      </Box>
    </Box>
  );
};

export default CashierMainPage;