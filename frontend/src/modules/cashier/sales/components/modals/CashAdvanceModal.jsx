import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box,
  Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';

const CashAdvanceModal = ({ open, onClose, onSubmit, paymentMethods, warehouses, loading }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');

  const availableMethods = paymentMethods.filter(method =>
    method.code !== 'VOUCHER' &&
    method.code !== 'ADVANCE'
  );

  const handleSubmit = () => {
    if (amount > 0 && paymentMethodCode && warehouseId) {
      onSubmit({ amount: parseFloat(amount), paymentMethodCode, warehouseId, note });
      handleClose();
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethodCode('');
    setWarehouseId('');
    setNote('');
    onClose();
  };

  const isValid = amount > 0 && paymentMethodCode && warehouseId;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" disableRestoreFocus>
      <DialogTitle>Încasează Avans Rapid</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off"
          sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

          <TextField
            autoFocus
            required
            margin="dense"
            label="Sumă"
            type="number"
            fullWidth
            variant="outlined"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {/* Selector gestiune */}
          <FormControl fullWidth required>
            <InputLabel>Gestiune</InputLabel>
            <Select
              value={warehouseId}
              label="Gestiune"
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="" disabled><em>Alege gestiunea...</em></MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Selector metodă de plată */}
          <FormControl fullWidth required>
            <InputLabel>Metodă de Plată</InputLabel>
            <Select
              value={paymentMethodCode}
              label="Metodă de Plată"
              onChange={(e) => setPaymentMethodCode(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="" disabled><em>Alege metoda...</em></MenuItem>
              {loading && <MenuItem disabled><CircularProgress size={20} /></MenuItem>}
              {availableMethods.map((method) => (
                <MenuItem key={method.id} value={method.code}>{method.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Notă (opțional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={handleClose}>Anulează</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isValid}>
          Încasează
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CashAdvanceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  paymentMethods: PropTypes.array.isRequired,
  warehouses: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

CashAdvanceModal.defaultProps = {
  loading: false,
};

export default CashAdvanceModal;