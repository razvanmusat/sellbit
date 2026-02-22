import React from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import AlertsContainer from '../../../shared/components/alerts/AlertsContainer';

// --- ICONIȚE PENTRU TABURI ADMIN ---
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Catalog
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen';       // Catering
import InventoryIcon from '@mui/icons-material/Inventory';           // Inventar
import TrendingUpIcon from '@mui/icons-material/TrendingUp';         // Vânzări/Rapoarte
import SettingsIcon from '@mui/icons-material/Settings';             // Setări sistem
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';     // Vouchere

const ADMIN_MENU = [
  { label: 'Catalog', path: '/admin/catalog', icon: <RestaurantMenuIcon /> },
  { label: 'Catering', path: '/admin/catering', icon: <SoupKitchenIcon /> },
  { label: 'Inventar', path: '/admin/inventory', icon: <InventoryIcon /> },
  { label: 'Vânzări', path: '/admin/sales', icon: <TrendingUpIcon /> },
  { label: 'Setări sistem', path: '/admin/settings', icon: <SettingsIcon /> },
  { label: 'Vouchere', path: '/admin/vouchers', icon: <CardGiftcardIcon /> },
];

const AdminTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar 
      position="static" 
      elevation={2}
      sx={{ 
        bgcolor: '#37474f',
        color: '#fff' 
      }} 
    >
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        
        {/* Meniul de Navigare Scrollabil */}
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
          {ADMIN_MENU.map((item) => {            
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
                  // Fără borderBottom
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        {/* Zona de Alerte */}
        <AlertsContainer />

      </Toolbar>
    </AppBar>
  );
};

export default AdminTopBar;