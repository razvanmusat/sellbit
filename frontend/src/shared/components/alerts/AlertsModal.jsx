import React, { useState, useEffect } from 'react';
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

const AlertsModal = ({ open, onClose, unclosedAlerts, expirationAlerts, onResolved }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expiration'); // 'unclosed' | 'expiration'
  const [error, setError] = useState(null);

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
                          Deschis: {new Date(alert.createdAt).toLocaleString('ro-RO')}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expirationAlerts.map((alert, idx) => {
                      const daysUntilExpiry = Math.floor(
                        (new Date(alert.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
                      );
                      const isExpired = daysUntilExpiry <= 0;

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
                            {new Date(alert.expirationDate).toLocaleDateString('ro-RO')}
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
    </Dialog>
  );
};

export default AlertsModal;
