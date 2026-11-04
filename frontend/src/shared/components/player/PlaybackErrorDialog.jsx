import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { shortName } from './playerUtils';

// Fereastra de confirmare la o eroare de redare a unui clip (raportată de agent). Un singur buton: OK.
const PlaybackErrorDialog = ({ error, onClose }) => (
  <Dialog open={!!error} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Eroare la redare</DialogTitle>
    <DialogContent>
      {error?.file && <DialogContentText sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{shortName(error.file)}</DialogContentText>}
      <DialogContentText sx={{ wordBreak: 'break-word' }}>{error?.message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained" autoFocus>OK</Button>
    </DialogActions>
  </Dialog>
);

export default PlaybackErrorDialog;
