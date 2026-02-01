import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, FormControl, InputLabel, Select, MenuItem, Box, Alert
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const CancelReceiptModal = ({ open, onClose, onConfirm, reasons, loading }) => {
  const [selectedReason, setSelectedReason] = useState('');

  // Resetăm selecția când se deschide modala
  useEffect(() => {
    if (open) setSelectedReason('');
  }, [open]);

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f' }}>
        <WarningAmberIcon /> Anulare Bon
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="warning">
            Această acțiune este ireversibilă! Bonul va fi anulat și produsele returnate în stoc.
          </Alert>

          <Typography variant="body2" fontWeight="bold">
            Selectează motivul anulării:
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel id="cancel-reason-label">Motiv</InputLabel>
            <Select
              labelId="cancel-reason-label"
              value={selectedReason}
              label="Motiv"
              onChange={(e) => setSelectedReason(e.target.value)}
            >
              {reasons.map((reason) => (
                <MenuItem key={reason.id} value={reason.id}>
                  {reason.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Renunță
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="error"
          disabled={!selectedReason || loading}
        >
          {loading ? 'Se procesează...' : 'Anulează Bonul'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CancelReceiptModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  reasons: PropTypes.array.isRequired,
  loading: PropTypes.bool
};

export default CancelReceiptModal;