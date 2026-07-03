import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, DialogContentText, Typography
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { buildGiftCardHtml, printVoucherHtml } from '../../../../../shared/utils/printVoucher';

const GiftCardModal = ({ open, onClose, onSubmit, paymentMethods, warehouses, loading }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);

  const availableMethods = paymentMethods.filter(
    (m) => m.code !== 'VOUCHER' && m.code !== 'ADVANCE',
  );

  const handleSubmit = async (skipFiscal = false) => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      // result = { closed, issued } — issued lipsește dacă bonul a rămas în procesare la casă
      const result = await onSubmit({ amount: parseFloat(amount), paymentMethodCode, warehouseId, note, skipFiscal });
      if (result?.issued?.code) {
        const html = await buildGiftCardHtml({
          code: result.issued.code,
          discountValue: result.issued.discountValue ?? parseFloat(amount),
          expiresAt: result.issued.expiresAt,
          receiptTemplate: result.issued.receiptTemplate,
        });
        printVoucherHtml(html);
      }
      if (result?.closed) handleClose();
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

  const isValid = parseFloat(amount) > 0 && paymentMethodCode && warehouseId;

  return (
    <>
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
            color="secondary"
            disabled={!isValid || submitting}
            startIcon={submitting ? <CircularProgress size={18} /> : <CardGiftcardIcon />}
          >
            {submitting ? 'Procesare...' : 'Vinde & Printează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmare vânzare manuală (fără bon fiscal) */}
      <Dialog open={manualConfirmOpen} onClose={() => setManualConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Vânzare manuală card cadou</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cardul cadou va fi vândut <strong>fără a emite bon fiscal</strong> pe casa de marcat.
            <br /><br />
            Folosește această opțiune doar dacă casa de marcat nu funcționează sau bonul fiscal
            a fost deja emis manual direct de pe casă.
            <br /><br />
            <Typography component="span" color="warning.dark" fontWeight="bold">
              Vânzarea va fi înregistrată în Sellbit, dar nu va apărea pe banda fiscală.
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
            Vinde fără bon fiscal
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
