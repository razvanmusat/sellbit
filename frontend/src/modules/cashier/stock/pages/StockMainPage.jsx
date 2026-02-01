import React from 'react';
import { Box } from '@mui/material';
import StockTabs from '../components/StockTabs';

const StockMainPage = () => {
  return (
    // Folosim height 100% ca să ne încadrăm perfect în layout-ul principal fără scroll dublu
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <StockTabs />
    </Box>
  );
};

export default StockMainPage;