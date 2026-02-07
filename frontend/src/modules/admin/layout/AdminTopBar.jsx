import React from 'react';
import { AppBar, Toolbar, Button, Box, IconButton, Badge } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationsIcon from '@mui/icons-material/Notifications';

// --- ICONIȚE PENTRU TABURI ADMIN ---
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Catalog
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen';       // Catering
import InventoryIcon from '@mui/icons-material/Inventory';           // Inventar
import StoreIcon from '@mui/icons-material/Store';                   // Gestiuni
import TrendingUpIcon from '@mui/icons-material/TrendingUp';         // Vânzări/Rapoarte
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'; // Utilizatori
import BusinessIcon from '@mui/icons-material/Business';             // Companie
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';     // Vouchere

const ADMIN_MENU = [
  { label: 'Catalog', path: '/admin/catalog', icon: <RestaurantMenuIcon /> },
  { label: 'Catering', path: '/admin/catering', icon: <SoupKitchenIcon /> },
  { label: 'Inventar', path: '/admin/inventory', icon: <InventoryIcon /> },
  { label: 'Gestiuni', path: '/admin/warehouses', icon: <StoreIcon /> },
  { label: 'Vânzări', path: '/admin/sales', icon: <TrendingUpIcon /> },
  { label: 'Utilizatori', path: '/admin/users', icon: <ManageAccountsIcon /> },
  { label: 'Companie', path: '/admin/company', icon: <BusinessIcon /> },
  { label: 'Vouchere', path: '/admin/vouchers', icon: <CardGiftcardIcon /> },
];

const AdminTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const notificationCount = 0; // Momentan 0, putem lega la notificări de sistem mai târziu

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

        {/* Zona de Notificări (Opțional, am adăugat-o să fie structura identică) */}
        <Box>
          <IconButton color="inherit">
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Box>

      </Toolbar>
    </AppBar>
  );
};

export default AdminTopBar;