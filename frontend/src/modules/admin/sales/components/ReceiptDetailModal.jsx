import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography, Box, Divider,
    IconButton, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import dayjs from 'dayjs';

const ReceiptDetailModal = ({ open, onClose, receipt }) => {
    const navigate = useNavigate();
    if (!receipt) return null;

    const isRefund = receipt.originalReceiptId !== null;
    const isCancelled = receipt.statusLabel === 'Anulat' || receipt.cancelReason != null;

    const cleanTableName = receipt.tableName?.replace(/^Masa:\s*/i, '') || 'Nespecificată';

    // Gestiuni unice din plăți
    const warehouses = [...new Map(
        (receipt.payments || [])
            .filter(p => p.warehouseId)
            .map(p => [p.warehouseId, { id: p.warehouseId, name: p.warehouseName }])
    ).values()];

    // Metode unice din plăți — [code, label]
    const methods = [...new Map(
        (receipt.payments || []).map(p => [
            p.methodCode || p.paymentMethodCode,
            p.methodLabel || p.paymentMethodLabel || p.methodCode || ''
        ])
    ).entries()];

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            slotProps={{ html: { "aria-hidden": "false" } }}
            disableRestoreFocus 
        >
            <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', py: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {isRefund ? 'Stornare' : 'Bon'} #{receipt.id}
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {dayjs(receipt.closedAt || receipt.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="h6" color={isRefund ? "error.main" : "primary.main"}
                            sx={{ fontWeight: 'bold' }}>
                            {receipt.totalAmount?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </Typography>
                        {!isRefund && !isCancelled && (
                            <Tooltip title="Editează bon" arrow>
                                <IconButton
                                    size="small"
                                    onClick={() => { onClose(); navigate(`/admin/sales/edit/${receipt.id}`); }}
                                    sx={{ color: 'warning.main' }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2"><strong>Casier:</strong> {receipt.userName}</Typography>
                    <Typography variant="body2"><strong>Masa:</strong> {cleanTableName}</Typography>
                    <Typography variant="body2">
                        <strong>Notițe:</strong> {receipt.note?.trim() ? (receipt.note) : (
                            <Box component="span" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                              Nu există notițe
                            </Box>)}
                    </Typography>
                    
                    {isCancelled && receipt.cancelReason && (
                        <Typography variant="body2" sx={{ color: 'error.main', mt: 0.5, fontWeight: 'bold' }}>
                            <strong>Motiv Anulare:</strong> {receipt.cancelReason}
                        </Typography>
                    )}
                </Box>

                {/* TABEL TIP ÎNCASARE */}
                {warehouses.length > 0 && methods.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Table size="small" sx={{ border: '1px solid #eee', borderRadius: 1 }}>
                            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>
                                        {isRefund ? 'Tip Restituire' : 'Tip Încasare'}
                                    </TableCell>
                                    {methods.map(([code, label]) => (
                                        <TableCell key={code} align="right"
                                            sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>
                                            {label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {warehouses.map(w => (
                                    <TableRow key={w.id}>
                                        <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>
                                            {w.name}
                                        </TableCell>
                                        {methods.map(([code]) => {
                                            const val = (receipt.payments || [])
                                                .filter(p =>
                                                    (p.methodCode || p.paymentMethodCode) === code &&
                                                    p.warehouseId === w.id
                                                )
                                                .reduce((sum, p) => sum + (p.amount || 0), 0);
                                            return (
                                                <TableCell key={code} align="right"
                                                    sx={{ py: 0.5, fontSize: '0.75rem' }}>
                                                    {val !== 0 ? `${Math.abs(val).toFixed(2)} RON` : '—'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* TABEL PRODUSE */}
                <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#fafafa' }}>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUS</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>GESTIUNE</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>CANT.</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>PREȚ</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>TOTAL</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {receipt.items?.map((item) => (
                                <TableRow key={item.receiptItemId} hover>
                                    <TableCell sx={{ py: 1 }}>{item.name}</TableCell>
                                    <TableCell sx={{ py: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                                        {item.warehouseName || '—'}
                                    </TableCell>
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