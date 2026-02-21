import React from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import StoreIcon from '@mui/icons-material/Store';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import BusinessIcon from '@mui/icons-material/Business';
import PercentIcon from '@mui/icons-material/Percent';

const SETTINGS_TABS = [
  { label: 'Gestiuni', value: 'warehouses', icon: <StoreIcon /> },
  { label: 'Utilizatori', value: 'users', icon: <ManageAccountsIcon /> },
  { label: 'Companie', value: 'company', icon: <BusinessIcon /> },
  { label: 'TVA', value: 'vat-rates', icon: <PercentIcon /> },
];

const getActiveTab = (pathname) => {
  if (pathname.includes('/admin/settings/users')) return 'users';
  if (pathname.includes('/admin/settings/company')) return 'company';
  if (pathname.includes('/admin/settings/vat-rates')) return 'vat-rates';
  return 'warehouses';
};

const SystemSettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const handleTabChange = (_, value) => {
    navigate(`/admin/settings/${value}`);
  };

  return (
    <Box sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>        
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {SETTINGS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default SystemSettingsPage;