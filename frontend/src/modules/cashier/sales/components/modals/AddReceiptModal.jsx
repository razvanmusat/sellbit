import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Box,
  IconButton 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; // Asigură-te că ai acest import

const AddReceiptModal = ({ open, onClose, onSubmit }) => {
  const [tableName, setTableName] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (tableName.trim()) {
      onSubmit({ tableName, note });
      handleClose();
    }
  };

  const handleClose = () => {
    setTableName('');
    setNote('');
    onClose();
  };

  // Funcția care ascultă tasta Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Oprește rândul nou la "Notă" sau submit-ul default
      // Dăm submit doar dacă avem nume la masă (validarea din buton)
      if (tableName.trim()) {
        handleSubmit();
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} // Asta asigură închiderea pe ESC și click în afară
      fullWidth 
      maxWidth="xs"
      disableRestoreFocus
    >
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Adaugă Bon Nou
        {/* Butonul X de închidere */}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
          <TextField
            autoFocus
            required
            margin="dense"
            id="tableName"
            label="Nume Masă / Client"
            type="text"
            fullWidth
            variant="outlined"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            onKeyDown={handleKeyDown} // Ascultă Enter aici
          />
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
            onKeyDown={handleKeyDown} // Ascultă Enter și aici (și previne rând nou)
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={handleClose} color="inherit">
          Anulează
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!tableName.trim()}
        >
          Creează
        </Button>
      </DialogActions>
    </Dialog>
  );
};

AddReceiptModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default AddReceiptModal;