import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box,
  Select, MenuItem, FormControl, InputLabel, CircularProgress,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { buildGiftCardHtml, printVoucherHtml } from '../../../../../shared/utils/printVoucher';

const GiftCardModal = ({ open, onClose, onSubmit, paymentMethods, warehouses, loading }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableMethods = paymentMethods.filter(
    (m) => m.code !== 'VOUCHER' && m.code !== 'ADVANCE',
  );

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const issued = await onSubmit({ amount: parseFloat(amount), paymentMethodCode, warehouseId, note });
      if (issued?.code) {
        const html = await buildGiftCardHtml({
          code: issued.code,
          discountValue: issued.discountValue ?? parseFloat(amount),
          expiresAt: issued.expiresAt,
          receiptTemplate: issued.receiptTemplate,
        });
        printVoucherHtml(html);
      }
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethodCode('');
    setWarehouseId('');
    setNote('');
    onClose();
  };

  const isValid = parseFloat(amount) > 0 && paymentMethodCode && warehouseId;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" disableRestoreFocus>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CardGiftcardIcon color="secondary" />
        Vinde Card Cadou
      </DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off"
          sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            required
            margin="dense"
            label="Valoare card (lei)"
            type="number"
            fullWidth
            variant="outlined"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{ htmlInput: { min: '1', step: '0.01' } }}
          />

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
              {availableMethods.map((m) => (
                <MenuItem key={m.id} value={m.code}>{m.label}</MenuItem>
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
          onClick={handleSubmit}
          variant="contained"
          color="secondary"
          disabled={!isValid || submitting}
          startIcon={submitting ? <CircularProgress size={18} /> : <CardGiftcardIcon />}
        >
          Vinde & Printează
        </Button>
      </DialogActions>
    </Dialog>
  );
};

GiftCardModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  paymentMethods: PropTypes.array.isRequired,
  warehouses: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

GiftCardModal.defaultProps = {
  loading: false,
};

export default GiftCardModal;
