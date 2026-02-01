import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box,
  Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';

const CashAdvanceModal = ({ open, onClose, onSubmit, paymentMethods, loading }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [note, setNote] = useState('');

  const availableMethods = paymentMethods.filter(method => 
    method.code !== 'VOUCHER' && 
    method.code !== 'ADVANCE'    
  );

  const handleSubmit = () => {
    if (amount > 0 && paymentMethodCode) {
      onSubmit({ amount: parseFloat(amount), paymentMethodCode, note });
      handleClose();
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethodCode('');
    setNote('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullWidth 
      maxWidth="xs"
      disableRestoreFocus
    >
      <DialogTitle>Încasează Avans Rapid</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          <TextField
            autoFocus
            required
            margin="dense"
            id="amount"
            label="Sumă"
            type="number"
            fullWidth
            variant="outlined"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <FormControl fullWidth required>
            <InputLabel id="payment-method-label">Metodă de Plată</InputLabel>
            <Select
              labelId="payment-method-label"
              id="paymentMethodCode"
              value={paymentMethodCode}
              label="Metodă de Plată"
              onChange={(e) => setPaymentMethodCode(e.target.value)}
              disabled={loading}
            >
              {/* Placeholder pentru a obliga selecția */}
              <MenuItem value="" disabled><em>Alege metoda...</em></MenuItem>
              
              {loading && <MenuItem disabled><CircularProgress size={20} /></MenuItem>}
              
              {/* Randăm lista filtrată */}
              {availableMethods.map((method) => (
                <MenuItem key={method.id} value={method.code}>
                  {method.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            id="note"
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
        <Button onClick={handleSubmit} variant="contained" disabled={!amount || !paymentMethodCode}>
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
  loading: PropTypes.bool,
};

CashAdvanceModal.defaultProps = {
  loading: false,
};

export default CashAdvanceModal;