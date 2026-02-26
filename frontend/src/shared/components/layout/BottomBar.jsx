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
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import StorefrontIcon from '@mui/icons-material/Storefront'; 
import KeyIcon from '@mui/icons-material/Key';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'; 
import { logout } from '../../../modules/auth/state/authSlice';
import { AuthService } from '../../api/AuthService';
import { UploadService } from '../../api/UploadService';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFileDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const BottomBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const currentUser = user || { fullName: 'Utilizator', authorityLevel: 0 };
  const hasAdminRights = currentUser.authorityLevel === 100;
  const hasCashierOrAdminRights = currentUser.authorityLevel >= 50;

  const isAdminMode = location.pathname.startsWith('/admin');
  
  const [time, setTime] = useState(new Date());
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadActionLoading, setUploadActionLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
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

  const loadUploadFiles = async () => {
    try {
      setUploadLoading(true);
      setUploadError('');
      const files = await UploadService.list();
      setUploadFiles(Array.isArray(files) ? files : []);
    } catch (error) {
      setUploadError(getFriendlyErrorMessage(error));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
    loadUploadFiles();
  };

  const handleCloseUploadModal = () => {
    if (uploadSubmitting || uploadActionLoading) return;
    setUploadModalOpen(false);
    setUploadError('');
    setFileInputKey((prev) => prev + 1);
  };

  const handleUploadSelectedFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadSubmitting(true);
      setUploadError('');
      await UploadService.upload(file);
      await loadUploadFiles();
      setSnackbar({ open: true, message: 'Fișier încărcat cu succes.', severity: 'success' });
    } catch (error) {
      setUploadError(getFriendlyErrorMessage(error));
    } finally {
      setUploadSubmitting(false);
      setFileInputKey((prev) => prev + 1);
    }
  };

  const handlePreviewFile = async (file) => {
    try {
      setUploadActionLoading(true);
      setUploadError('');
      const blob = await UploadService.fetchPreviewBlob(file.fileName);
      const previewUrl = URL.createObjectURL(blob);
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    } catch (error) {
      setUploadError(getFriendlyErrorMessage(error));
    } finally {
      setUploadActionLoading(false);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      setUploadActionLoading(true);
      setUploadError('');
      const blob = await UploadService.fetchDownloadBlob(file.fileName);
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = file.originalName || file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setUploadError(getFriendlyErrorMessage(error));
    } finally {
      setUploadActionLoading(false);
    }
  };

  const handleDeleteFile = async (file) => {
    const confirmed = window.confirm(`Ștergi fișierul "${file.originalName || file.fileName}"?`);
    if (!confirmed) return;

    try {
      setUploadActionLoading(true);
      setUploadError('');
      await UploadService.delete(file.fileName);
      await loadUploadFiles();
      setSnackbar({ open: true, message: 'Fișier șters.', severity: 'success' });
    } catch (error) {
      setUploadError(getFriendlyErrorMessage(error));
    } finally {
      setUploadActionLoading(false);
    }
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

        {/* CENTRU: Butoane rapide */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, width: 118 }}>
          {hasCashierOrAdminRights && (
            <Tooltip title="Upload fișiere">
              <span>
                <IconButton color="primary" onClick={handleOpenUploadModal} disabled={uploadSubmitting || uploadActionLoading}>
                  <UploadFileIcon fontSize="medium" />
                </IconButton>
              </span>
            </Tooltip>
          )}

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

      <Dialog open={uploadModalOpen} onClose={handleCloseUploadModal} fullWidth maxWidth="md">
        <DialogTitle>Upload fișiere</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {uploadError && <Alert severity="error">{uploadError}</Alert>}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                component="label"
                startIcon={uploadSubmitting ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                disabled={uploadSubmitting || uploadActionLoading}
              >
                Încarcă fișier
                <input key={fileInputKey} type="file" hidden onChange={handleUploadSelectedFile} />
              </Button>

              <Button
                color="inherit"
                startIcon={<RefreshIcon />}
                onClick={loadUploadFiles}
                disabled={uploadLoading || uploadSubmitting || uploadActionLoading}
              >
                Reîmprospătează
              </Button>
            </Box>

            {uploadLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : uploadFiles.length === 0 ? (
              <Alert severity="info">Nu există fișiere încărcate.</Alert>
            ) : (
              <List dense sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 0 }}>
                {uploadFiles.map((file, index) => (
                  <React.Fragment key={file.fileName}>
                    <ListItem
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                          <Tooltip title="Previzualizează">
                            <span>
                              <IconButton edge="end" onClick={() => handlePreviewFile(file)} disabled={uploadSubmitting || uploadActionLoading}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Descarcă">
                            <span>
                              <IconButton edge="end" onClick={() => handleDownloadFile(file)} disabled={uploadSubmitting || uploadActionLoading}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          {hasAdminRights && (
                            <Tooltip title="Șterge">
                              <span>
                                <IconButton
                                  edge="end"
                                  color="error"
                                  onClick={() => handleDeleteFile(file)}
                                  disabled={uploadSubmitting || uploadActionLoading}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={file.originalName || file.fileName}
                        secondary={`${formatFileSize(file.size)} • ${formatFileDate(file.lastModified)}`}
                        slotProps={{
                          primary: { sx: { fontWeight: 600, pr: 12 }, variant: 'body2' },
                          secondary: { sx: { color: 'text.secondary', pr: 12 }, variant: 'caption' }
                        }}
                      />
                    </ListItem>
                    {index < uploadFiles.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadModal} color="inherit" disabled={uploadSubmitting || uploadActionLoading}>Închide</Button>
        </DialogActions>
      </Dialog>

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