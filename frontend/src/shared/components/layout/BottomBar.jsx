import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import StorefrontIcon from '@mui/icons-material/Storefront'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'; 
import { logout } from '../../../modules/auth/state/authSlice';

const BottomBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const currentUser = user || { fullName: 'Utilizator', authorityLevel: 0 };
  const hasAdminRights = currentUser.authorityLevel === 100;

  const isAdminMode = location.pathname.startsWith('/admin');
  
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar 
      position="static" 
      color="default" 
      elevation={0}
      sx={{ 
        top: 'auto', 
        bottom: 0, 
        borderTop: 1, 
        borderColor: 'divider', 
        bgcolor: 'background.paper',
        // Prevenim orice layout shift
        height: '56px', 
        justifyContent: 'center'
      }}
    >
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: '48px !important' }}>
        
        {/* STÂNGA: Info User (Flex 1) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {isAdminMode ? 'Mod Administrare: ' : 'Bun venit, '}
          </Typography>
          <Typography variant="body2" color="text.primary" fontWeight="bold" noWrap>
            {currentUser.fullName}
          </Typography>
        </Box>

        {/* CENTRU: Buton Switch (Flex 0 - lățime fixă ca să nu miște restul) */}
        <Box sx={{ display: 'flex', justifyContent: 'center', width: 60 }}>
          {hasAdminRights && (
             isAdminMode ? (
                <Tooltip title="Înapoi la Vânzare">
                  <IconButton onClick={() => navigate('/home/sell')} sx={{ color: '#2e7d32' }}>
                    <StorefrontIcon fontSize="medium" /> {/* Aceeași mărime ca Settings */}
                  </IconButton>
                </Tooltip>
             ) : (
                <Tooltip title="Panou Administrare">
                  <IconButton color="primary" onClick={() => navigate('/admin/dashboard')}>
                    <SettingsSuggestIcon fontSize="medium" />
                  </IconButton>
                </Tooltip>
             )
          )}
        </Box>

        {/* DREAPTA: Ceas & Logout (Flex 1) */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
           <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 45, textAlign: 'right' }}>
             {time.toLocaleTimeString('ro-RO', { hour12: false, hour: '2-digit', minute:'2-digit' })}
           </Typography>

          <Button color="error" onClick={handleLogout} sx={{ minWidth: 'auto', p: 1 }}>
            <LogoutIcon fontSize="small" />
          </Button>
        </Box>

      </Toolbar>
    </AppBar>
  );
};

export default BottomBar;