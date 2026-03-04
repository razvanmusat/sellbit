import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomBar from './BottomBar';

const MainLayout = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh',
      overflow: 'hidden' 
    }}>
      {/* Bara de Sus */}
      <TopBar />

      {/* Continutul Principal (Scrollable) */}
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
        <Outlet />
      </Box>

      {/* Bara de Jos */}
      <BottomBar />
    </Box>
  );
};

export default MainLayout;