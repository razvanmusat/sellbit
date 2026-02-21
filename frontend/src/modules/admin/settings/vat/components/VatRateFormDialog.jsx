import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  TextField,
} from '@mui/material';

const VatRateFormDialog = ({ open, onClose, onSave, saving, form, setField }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{form.id ? 'Editeaza cota TVA' : 'Adauga cota TVA'}</DialogTitle>
      <DialogContent component="form" autoComplete="off">
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Cod"
            value={form.code}
            onChange={(e) => setField('code', e.target.value)}
            fullWidth
            autoComplete="off"
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
            helperText="Ex: TVA19"
          />
          <TextField
            label="Denumire"
            value={form.label}
            onChange={(e) => setField('label', e.target.value)}
            fullWidth
            autoComplete="off"
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
          />
          <TextField
            label="Rata (%)"
            type="number"
            value={form.rate}
            onChange={(e) => setField('rate', e.target.value)}
            fullWidth
            autoComplete="off"
            slotProps={{ htmlInput: { step: '0.01', min: '0', autoComplete: 'off' } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Anuleaza</Button>
        <Button onClick={onSave} variant="contained" disabled={saving}>
          {saving ? 'Se salveaza...' : 'Salveaza'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VatRateFormDialog;
