import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Paper, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { SalesService } from '../../api/SalesService';

const ChangeWarehouseModal = ({
  open,
  onClose,
  warehouses,
  warehouseId,
  onSuccess,
}) => {
  const [date, setDate] = useState(dayjs());
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, receipt: null });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = date.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = date.endOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const data = await SalesService.getReceiptsReport(warehouseId, 'CLOSED', start, end);
      setReceipts(data.sort((a, b) => b.closedAt.localeCompare(a.closedAt)));
    } catch (e) {
      setError(e.message || 'Eroare la încărcarea bonurilor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && warehouseId) fetchReceipts();
    // eslint-disable-next-line
  }, [date, warehouseId, open]);

  const handleSwapClick = (receipt) => {
    setConfirmDialog({ open: true, receipt });
    const others = warehouses.filter(w => w.id !== warehouseId);
    if (others.length === 1) {
      setSelectedWarehouseId(others[0].id);
    } else {
      setSelectedWarehouseId(null);
    }
    setModalError(null);
  };

  const handleCloseConfirm = () => {
    setConfirmDialog({ open: false, receipt: null });
    setSelectedWarehouseId(null);
    setModalLoading(false);
    setModalError(null);
  };

  const handleConfirm = async () => {
    if (!confirmDialog.receipt || !selectedWarehouseId || modalLoading) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await SalesService.changeReceiptWarehouse(confirmDialog.receipt.id, selectedWarehouseId);
      handleCloseConfirm();
      await fetchReceipts();
      if (onSuccess) {
        onSuccess();
      }
      setSnackbar({ open: true, message: 'Mutare efectuată cu succes!', severity: 'success' });
    } catch (e) {
      const friendly = getFriendlyErrorMessage(e);
      setModalError(friendly);
      setSnackbar({ open: true, message: friendly, severity: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const otherWarehouses = warehouses.filter(w => w.id !== warehouseId);
  const warehouse = warehouses.find(w => w.id === warehouseId);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              Bonuri închise - {warehouse?.name || warehouseId}
            </Box>
            <Box>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Selectează ziua"
                  value={date}
                  onChange={newDate => setDate(newDate)}
                  format="DD.MM.YYYY"
                  slotProps={{ textField: { size: 'small' } }}
                />
              </LocalizationProvider>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : error ? (
            <Typography color="error" mt={2}>{error}</Typography>
          ) : receipts.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" mt={4}>
              Nu există bonuri închise pentru data selectată.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Nr Bon</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Masa</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Suma</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Notite</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Data/Ora închiderii</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Mută</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map(receipt => (
                    <TableRow key={receipt.id}>
                      <TableCell align="center">#{receipt.id}</TableCell>
                      <TableCell align="center">{receipt.tableName || 'Fără masă'}</TableCell>
                      <TableCell align="center" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{receipt.totalAmount} Lei</TableCell>
                      <TableCell align="center">{receipt.note || '-'}</TableCell>
                      <TableCell align="center">{receipt.closedAt ? dayjs(receipt.closedAt).format('DD/MM/YYYY HH:mm') : ''}</TableCell>
                      <TableCell align="center">
                        <IconButton edge="end" color="primary" onClick={() => handleSwapClick(receipt)}>
                          <SwapHorizIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">Închide</Button>
        </DialogActions>

        {/* Confirm Dialog pentru mutare gestiune */}
        <Dialog open={confirmDialog.open} onClose={handleCloseConfirm} maxWidth="xs" fullWidth>
          <DialogTitle>Mutare gestiune bon</DialogTitle>
          <DialogContent>
            {confirmDialog.receipt && (
              <Box mb={2}>
                <Typography variant="body2" mb={1}>
                  Sigur vrei să muți bonul <b>#{confirmDialog.receipt.id}</b> în valoare de <b>{confirmDialog.receipt.totalAmount} Lei</b>?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Închis la: {confirmDialog.receipt.closedAt ? dayjs(confirmDialog.receipt.closedAt).format('DD/MM/YYYY HH:mm') : ''}<br />
                  Notă: {confirmDialog.receipt.note || '-'}
                </Typography>
              </Box>
            )}
            {otherWarehouses.length === 1 ? (
              <Box mb={2}>
                <Typography variant="body2" color="primary">
                  Noua gestiune: <b>{otherWarehouses[0].name}</b>
                </Typography>
              </Box>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Gestiune nouă</InputLabel>
                <Select
                  value={selectedWarehouseId || ''}
                  label="Gestiune nouă"
                  onChange={e => setSelectedWarehouseId(e.target.value)}
                  disabled={modalLoading || otherWarehouses.length === 0}
                >
                  {otherWarehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {modalError && <Typography color="error" mt={2}>{modalError}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirm} color="inherit" disabled={modalLoading}>Anulează</Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="primary"
              disabled={modalLoading || (!selectedWarehouseId && otherWarehouses.length > 1)}
            >
              Confirmă
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: 90, sm: 110 } }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontSize: '1rem', fontWeight: 'bold', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

ChangeWarehouseModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  warehouses: PropTypes.array.isRequired,
  warehouseId: PropTypes.number.isRequired,
  onSuccess: PropTypes.func,
};

export default ChangeWarehouseModal;
