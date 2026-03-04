import React from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import AlertsContainer from '../alerts/AlertsContainer';

import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CakeIcon from '@mui/icons-material/Cake';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import InventoryIcon from '@mui/icons-material/Inventory';

const MENU_ITEMS = [
  { label: 'Vânzare', path: '/home/sell', icon: <PointOfSaleIcon /> },
  { label: 'Casierie', path: '/home/cashier', icon: <LocalAtmIcon /> },
  { label: 'Rezervări', path: '/home/reservations', icon: <CakeIcon /> },
  { label: 'Catering', path: '/home/catering', icon: <FastfoodIcon /> },
  { label: 'Stoc', path: '/home/stock', icon: <InventoryIcon /> },
];

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          minWidth: 0,       
          overflowX: 'auto', 
          flex: 1,           
          mr: 2,             
          '&::-webkit-scrollbar': { display: 'none' }, 
          scrollbarWidth: 'none',                      
        }}>
          {MENU_ITEMS.map((item) => {            
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Button
                key={item.label}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
        
        <AlertsContainer />
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;