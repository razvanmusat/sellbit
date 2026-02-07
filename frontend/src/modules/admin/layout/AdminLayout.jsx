import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AdminTopBar from './AdminTopBar';
// Importăm BottomBar-ul din Shared (calea relativă depinde de structura ta exactă)
import BottomBar from '../../../shared/components/layout/BottomBar'; 

const AdminLayout = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', // Fix pentru mobil
      overflow: 'hidden' 
    }}>
      {/* 1. Top Bar Admin */}
      <AdminTopBar />

      {/* 2. Conținut Variabil */}
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
        <Outlet />
      </Box>

      {/* 3. Bottom Bar Comun */}
      <BottomBar />
    </Box>
  );
};

export default AdminLayout;