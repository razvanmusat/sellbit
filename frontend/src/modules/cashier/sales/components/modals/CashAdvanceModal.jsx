import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, DialogContentText, Typography
} from '@mui/material';

const CashAdvanceModal = ({ open, onClose, onSubmit, paymentMethods, warehouses, loading }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);

  const availableMethods = paymentMethods.filter(method =>
    method.code !== 'VOUCHER' &&
    method.code !== 'ADVANCE'
  );

  const handleSubmit = async (skipFiscal = false) => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const canClose = await onSubmit({ amount: parseFloat(amount), paymentMethodCode, warehouseId, note, skipFiscal });
      if (canClose) handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setAmount('');
    setPaymentMethodCode('');
    setWarehouseId('');
    setNote('');
    onClose();
  };

  const isValid = amount > 0 && paymentMethodCode && warehouseId;

  return (
    <>
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
          <Button onClick={handleClose} disabled={submitting}>Anulează</Button>
          <Button
            onClick={() => setManualConfirmOpen(true)}
            variant="outlined"
            color="warning"
            disabled={!isValid || submitting}
          >
            Încasare manuală
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            variant="contained"
            disabled={!isValid || submitting}
            startIcon={submitting ? <CircularProgress size={18} /> : null}
          >
            {submitting ? 'Procesare...' : 'Încasează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmare încasare manuală (fără bon fiscal) */}
      <Dialog open={manualConfirmOpen} onClose={() => setManualConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Încasare manuală avans</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Avansul va fi înregistrat <strong>fără a emite bon fiscal</strong> pe casa de marcat.
            <br /><br />
            Folosește această opțiune doar dacă casa de marcat nu funcționează sau bonul fiscal
            a fost deja emis manual direct de pe casă.
            <br /><br />
            <Typography component="span" color="warning.dark" fontWeight="bold">
              Încasarea va fi înregistrată în Sellbit, dar nu va apărea pe banda fiscală.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualConfirmOpen(false)} autoFocus>Anulează</Button>
          <Button
            onClick={() => { setManualConfirmOpen(false); handleSubmit(true); }}
            variant="contained"
            color="warning"
          >
            Încasează fără bon fiscal
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
