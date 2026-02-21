import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, Typography, Box, Divider, Stack
} from '@mui/material';
import dayjs from 'dayjs';

const ReceiptDetailModal = ({ open, onClose, receipt }) => {
    if (!receipt) return null;

    const isRefund = receipt.originalReceiptId !== null;
    const isCancelled = receipt.statusLabel === 'Anulat' || receipt.cancelReason != null;

    const paymentMethods = receipt.payments
        ?.map(p => `${p.methodLabel}${p.additionalInfo ? ` (${p.additionalInfo})` : ''}`)
        .join(', ') || 'Nespecificat';

    // Curățăm tableName de prefixul "Masa:" dacă acesta există deja în string-ul din DB
    const cleanTableName = receipt.tableName?.replace(/^Masa:\s*/i, '') || 'Nespecificată';

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            slotProps={{
                html: { "aria-hidden": "false" }
            }}
            disableRestoreFocus 
        >
            <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', py: 1 }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%' }}>
        
        {/* 1. Stânga: ID Bon */}
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {isRefund ? 'Stornare' : 'Bon'} #{receipt.id}
        </Typography>

        {/* 2. Centru: Data și Ora */}
        <Typography 
            sx={{ 
                fontSize: '0.85rem', 
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                textAlign: 'center'
            }}
        >
            {dayjs(receipt.closedAt || receipt.createdAt).format('DD.MM.YYYY HH:mm')}
        </Typography>

        {/* 3. Dreapta: Preț */}
        <Typography 
            variant="h6" 
            color={isRefund ? "error.main" : "primary.main"} 
            sx={{ fontWeight: 'bold', textAlign: 'right' }}
        >
            {receipt.totalAmount?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
        </Typography>

    </Box>
</DialogTitle>
            
            <DialogContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2"><strong>Gestiune:</strong> {receipt.warehouseName}</Typography>
                    <Typography variant="body2"><strong>Casier:</strong> {receipt.userName}</Typography>
                    
                    {/* Afișăm doar numele mesei fără prefix dublu */}
                    <Typography variant="body2"><strong>Masa:</strong> {cleanTableName}</Typography>
                    
                    {/* Afișăm nota din variabila note confirmată în DTO */}
                    {receipt.note && (
                        <Typography variant="body2"><strong>Notă:</strong> {receipt.note}</Typography>
                    )}

                    <Typography variant="body2">
                        <strong>{isRefund ? 'Tip Restituire:' : 'Tip Încasare:'}</strong> {paymentMethods}
                    </Typography>

                    {isCancelled && receipt.cancelReason && (
                        <Typography variant="body2" sx={{ color: 'error.main', mt: 0.5, fontWeight: 'bold' }}>
                            <strong>Motiv Anulare:</strong> {receipt.cancelReason}
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#fafafa' }}>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUS</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>CANT.</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>PREȚ</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>TOTAL</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {receipt.items?.map((item) => (
                                <TableRow key={item.receiptItemId} hover>
                                    <TableCell sx={{ py: 1 }}>{item.name}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">
                                        {item.price?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                        {item.lineTotal?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
                <Button onClick={onClose} variant="contained" color="primary" fullWidth>
                    Închide
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReceiptDetailModal;