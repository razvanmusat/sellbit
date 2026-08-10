import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AlertsService } from './AlertsService';
import 'dayjs/locale/ro';

const AlertsModal = ({ open, onClose, unclosedAlerts, expirationAlerts, onResolved }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expiration'); // 'unclosed' | 'expiration'
  const [error, setError] = useState(null);
  const [editingAlert, setEditingAlert] = useState(null);
  const [expirationDate, setExpirationDate] = useState(null);
  const [savingExpiration, setSavingExpiration] = useState(false);

  // Smart tab opening logic
  useEffect(() => {
    if (!open) return;
    
    const hasUnclosed = unclosedAlerts && unclosedAlerts.length > 0;
    const hasExpiration = expirationAlerts && expirationAlerts.length > 0;

    if (hasUnclosed && hasExpiration) {
      // Both: open unclosed first to resolve immediately
      setActiveTab('unclosed');
    } else if (hasUnclosed) {
      // Only unclosed
      setActiveTab('unclosed');
    } else {
      // Default to expiration (even if empty)
      setActiveTab('expiration');
    }
  }, [open, unclosedAlerts, expirationAlerts]);

  const handleGoToSell = () => {
    onClose?.();
    navigate('/home/sell');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
  };

  const handleEditExpiration = (alert) => {
    setEditingAlert(alert);
    setExpirationDate(dayjs(alert.expirationDate));
    setError(null);
  };

  const handleCloseExpirationEditor = () => {
    if (savingExpiration) return;
    setEditingAlert(null);
    setExpirationDate(null);
    setError(null);
  };

  const handleSaveExpiration = async () => {
    if (!editingAlert || !expirationDate?.isValid()) return;

    setSavingExpiration(true);
    setError(null);
    try {
      await AlertsService.updateExpirationDate(
        editingAlert.purchaseId,
        expirationDate.format('YYYY-MM-DD')
      );
      setEditingAlert(null);
      setExpirationDate(null);
      onResolved?.();
    } catch (err) {
      setError(err.message || 'Nu s-a putut actualiza data expirării.');
    } finally {
      setSavingExpiration(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Alerte sistem
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Button
            onClick={() => handleTabChange('expiration')}
            variant={activeTab === 'expiration' ? 'contained' : 'text'}
            size="small"
            startIcon={<WarningIcon />}
          >
            Expirări ({expirationAlerts.length})
          </Button>
          <Button
            onClick={() => handleTabChange('unclosed')}
            variant={activeTab === 'unclosed' ? 'contained' : 'text'}
            size="small"
            startIcon={<ErrorIcon />}
          >
            Bonuri uitate ({unclosedAlerts.length})
          </Button>
        </Box>

        {/* Bonuri neinchise */}
        {activeTab === 'unclosed' && (
          <Box>
            {unclosedAlerts.length === 0 ? (
              <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                Nu sunt alerte
              </Typography>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {unclosedAlerts.map((alert, idx) => (
                  <React.Fragment key={alert.receiptId}>
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        pb: 2,
                        backgroundColor: idx % 2 === 0 ? 'action.hover' : 'transparent',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ width: '100%', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Bon #{alert.receiptNumber}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Deschis: {dayjs(alert.createdAt).format('DD.MM.YYYY HH:mm')}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Gestiune:</strong> {alert.warehouseName}
                      </Typography>

                      <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                        ⚠️ Bon deschis de ieri! Intră în vânzare pentru a-l gestiona.
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={handleGoToSell}
                        >
                          Mergi la vânzare
                        </Button>
                      </Box>
                    </ListItem>
                    {idx < unclosedAlerts.length - 1 && <Divider sx={{ my: 1 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Produse care expiră */}
        {activeTab === 'expiration' && (
          <Box>
            {expirationAlerts.length === 0 ? (
              <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                Nu sunt alerte
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#fafafa' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>
                        PRODUS
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>
                        GESTIUNE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>
                        CANTITATE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>
                        EXPIRARE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem' }}>
                        ACȚIUNI
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expirationAlerts.map((alert) => {
                      const isExpired = Number(alert.daysUntilExpiration) <= 0;

                      return (
                        <TableRow
                          key={alert.purchaseId}
                          hover
                          sx={{
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <TableCell sx={{ py: 1, fontSize: '0.9rem' }}>
                            {alert.productName}
                            {isExpired && (
                              <Typography variant="caption" display="block" color="error" sx={{ fontWeight: 'bold' }}>
                                ⚠️ EXPIRAT
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1, fontSize: '0.9rem' }}>
                            {alert.warehouseName}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1, fontSize: '0.9rem', fontWeight: 'bold', pr: 0.5 }}>
                            {alert.remainingQuantity}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              py: 1,
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              color: '#d32f2f',
                              pl: 0.5,
                            }}
                          >
                            {dayjs(alert.expirationDate).format('DD.MM.YYYY')}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditCalendarIcon />}
                              onClick={() => handleEditExpiration(alert)}
                            >
                              Corectează
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Inchide
        </Button>
      </DialogActions>

      <Dialog open={Boolean(editingAlert)} onClose={handleCloseExpirationEditor} fullWidth maxWidth="xs">
        <DialogTitle>Corectează data expirării</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {editingAlert?.productName} — {editingAlert?.warehouseName}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
            <DatePicker
              label="Data expirării"
              value={expirationDate}
              onChange={setExpirationDate}
              format="DD.MM.YYYY"
              slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExpirationEditor} disabled={savingExpiration}>
            Renunță
          </Button>
          <Button
            onClick={handleSaveExpiration}
            variant="contained"
            disabled={savingExpiration || !expirationDate?.isValid()}
          >
            Salvează
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default AlertsModal;
