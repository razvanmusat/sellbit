import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert
} from '@mui/material';

const contextLabels = {
    create: 'Utilizator creat',
    reset: 'Parolă resetată',
    reactivate: 'Utilizator reactivat'
};

const TempPasswordModal = ({ open, onClose, tempPassword, username, context = 'create' }) => {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{contextLabels[context] || 'Parolă temporară'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Utilizator: <strong>{username || '-'}</strong>
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Salvează parola temporară acum. După închidere nu mai este afișată.
                </Alert>
                <Box
                    sx={{
                        p: 1.5,
                        bgcolor: '#f5f5f5',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h6" sx={{ letterSpacing: 2, fontWeight: 900 }}>
                        {tempPassword || '-'}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" fullWidth>
                    Închide
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TempPasswordModal;
