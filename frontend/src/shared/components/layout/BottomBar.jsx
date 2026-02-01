import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'; 
import { logout } from '../../../modules/auth/state/authSlice';

const BottomBar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Extragem userul din Redux (presupunând că state.auth.user este populat la login)
  const { user } = useSelector((state) => state.auth);
  
  // Fallback pentru siguranță (în caz că userul e null momentan)
  const currentUser = user || { fullName: 'Utilizator', authorityLevel: 0 };
  
  // Afișăm butonul doar dacă authorityLevel este 100 (Admin)
  const showAdminButton = currentUser.authorityLevel === 100;
  
  const [time, setTime] = useState(new Date());

  // Logica Ceas Digital
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Ștergem datele de autentificare din Redux și (implicit) din localStorage
    dispatch(logout());
    // Redirecționăm către pagina de login
    navigate('/login');
  };

  return (
    <AppBar 
      position="static" 
      color="default" 
      elevation={0}
      sx={{ top: 'auto', bottom: 0, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', py: 0.5 }}>
        
        {/* Stanga: Bun venit + Nume */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, mr: 1, overflow: 'hidden' }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mr: { md: 0.5 }, lineHeight: 1.2 }}
          >
            Bun venit,
          </Typography>
          <Typography 
            variant="body2" 
            color="text.primary"
            fontWeight="bold"
            noWrap
            sx={{ lineHeight: 1.2 }}
          >
            {currentUser.fullName}
          </Typography>
        </Box>

        {/* Centru: Rotita Admin (Centrată și mai mare) */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {showAdminButton && (
            <Tooltip title="Administrare">
              <IconButton color="primary" onClick={() => navigate('/admin/dashboard')}>
                <SettingsSuggestIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Dreapta: Ceas, Logout */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          
          {/* Ceas */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
             <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1 }}>
                {time.toLocaleTimeString('ro-RO', { hour12: false })}
             </Typography>
          </Box>

          <Button 
            color="error" 
            onClick={handleLogout}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline' }, mr: 1 }}>Deconectare</Box>
            <LogoutIcon fontSize="small" />
          </Button>
        </Box>

      </Toolbar>
    </AppBar>
  );
};

export default BottomBar;