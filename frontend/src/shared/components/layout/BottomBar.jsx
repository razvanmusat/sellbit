import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import StorefrontIcon from '@mui/icons-material/Storefront'; 
import KeyIcon from '@mui/icons-material/Key';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'; 
import { logout } from '../../../modules/auth/state/authSlice';
import { AuthService } from '../../api/AuthService';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';

const BottomBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const currentUser = user || { fullName: 'Utilizator', authorityLevel: 0 };
  const hasAdminRights = currentUser.authorityLevel === 100;

  const isAdminMode = location.pathname.startsWith('/admin');
  
  const [time, setTime] = useState(new Date());
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const weekdayLabel = time.toLocaleDateString('ro-RO', { weekday: 'long' });
  const dateLabel = time.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = time.toLocaleTimeString('ro-RO', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleOpenPasswordModal = () => {
    setPasswordError('');
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    if (passwordLoading) return;
    setPasswordModalOpen(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setPasswordError('Completează parola veche, parola nouă și confirmarea parolei.');
      return;
    }

    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setPasswordError('Parola nouă și confirmarea parolei nu coincid.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');
      await AuthService.changeOwnPassword(oldPassword.trim(), newPassword.trim());
      setPasswordModalOpen(false);
      setSnackbar({ open: true, message: 'Parola a fost schimbată cu succes.', severity: 'success' });
    } catch (error) {
      setPasswordError(getFriendlyErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
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
        height: { xs: '50px', sm: '56px' }, 
        justifyContent: 'center'
      }}
    >
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: '48px !important' }}>
        
        {/* STÂNGA: Info User (Flex 1) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {isAdminMode ? 'Mod Administrare: ' : 'Bun venit, '}
          </Typography>
          <Typography variant="body2" color="text.primary" fontWeight="bold" noWrap sx={{ maxWidth: { xs: 110, sm: 260 } }}>
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
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          <Button
            size="small"
            color="primary"
            sx={{ textTransform: 'none', minWidth: 'auto', px: 0.5, display: { xs: 'none', sm: 'inline-flex' } }}
            onClick={handleOpenPasswordModal}
          >
            Schimbă parola
          </Button>

          <Tooltip title="Schimbă parola">
            <IconButton color="primary" size="small" onClick={handleOpenPasswordModal} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
              <KeyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.6, textTransform: 'capitalize' }}>
            <Typography variant="body2" fontWeight={700}>{weekdayLabel}</Typography>
            <Typography variant="body2" color="text.secondary">{dateLabel}</Typography>
            <Typography variant="body2" color="text.secondary">-</Typography>
            <Typography variant="body2" fontWeight={800}>{timeLabel}</Typography>
          </Box>

          <Typography variant="body2" fontWeight={800} sx={{ display: { xs: 'block', sm: 'none' }, minWidth: 45, textAlign: 'right' }}>
            {timeLabel}
          </Typography>

          <Button color="error" onClick={handleLogout} sx={{ minWidth: 'auto', p: 1, gap: 0.5 }}>
            <LogoutIcon fontSize="small" />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Deconectare</Box>
          </Button>
        </Box>

      </Toolbar>

      <Dialog open={passwordModalOpen} onClose={handleClosePasswordModal} fullWidth maxWidth="xs">
        <DialogTitle>Schimbă parola</DialogTitle>
        <DialogContent component="form" autoComplete="off">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {passwordError && <Alert severity="error">{passwordError}</Alert>}
            <TextField
              label="Parola veche"
              type="password"
              size="small"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="new-password"
              slotProps={{ htmlInput: { autoComplete: 'new-password', name: 'sb-current-password' } }}
              fullWidth
            />
            <TextField
              label="Parola nouă"
              type="password"
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              slotProps={{ htmlInput: { autoComplete: 'new-password', name: 'sb-new-password' } }}
              helperText="Minim 6 caractere, cu literă mare, literă mică, cifră și semn de punctuație."
              fullWidth
            />
            <TextField
              label="Confirmă parola nouă"
              type="password"
              size="small"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              slotProps={{ htmlInput: { autoComplete: 'new-password', name: 'sb-confirm-password' } }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordModal} color="inherit" disabled={passwordLoading}>Anulează</Button>
          <Button onClick={handleChangePassword} variant="contained" disabled={passwordLoading}>
            {passwordLoading ? <CircularProgress size={18} color="inherit" /> : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppBar>
  );
};

export default BottomBar;