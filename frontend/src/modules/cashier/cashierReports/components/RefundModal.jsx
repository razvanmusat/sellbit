import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Checkbox, 
  Typography, Box, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl,
  IconButton, useMediaQuery, useTheme
} from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloseIcon from '@mui/icons-material/Close';

import { useRefundModal } from '../hooks/useRefundModal'; // <--- IMPORT HOOK

const RefundModal = ({ open, onClose, receipt, onRefundSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); 

  // --- EXTRAGERE LOGICĂ DIN HOOK ---
  const { 
      state, 
      setters, 
      handlers 
  } = useRefundModal(open, receipt, onClose, onRefundSuccess);

  const { 
      items, paymentMethods, originalPayments, loadingItems, submitting, error, 
      refundMap, paymentMethodId, totalRefundAmount, hasSelection 
  } = state;

  const { setPaymentMethodId } = setters;
  
  const { 
      getRefundLimit, handleIncrement, handleDecrement, 
      handleToggleCheck, handleSubmitRefund 
  } = handlers;

  return (
    <Dialog 
        open={open} 
        onClose={onClose} 
        fullScreen={isMobile} 
        maxWidth="md" 
        fullWidth
        disableRestoreFocus // <--- Păstrat corecția
    >
      <DialogTitle sx={{ borderBottom: '1px solid #eee', py: 1.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
                <Typography variant="h6" component="span" sx={{ mr: 1 }}>
                    Retur Produse - {receipt?.tableName || 'Fără masă'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {receipt?.note ? `• Notițe: ${receipt.note}` : ''}
                </Typography>
            </Box>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: { xs: 1, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loadingItems ? (
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} elevation={0} variant="outlined">
            
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                  <col style={{ width: '50px' }} />  
                  <col style={{ width: 'auto' }} />  
                  <col style={{ width: '140px' }} /> 
                  <col style={{ width: '100px' }} /> 
              </colgroup>

              <TableHead sx={{ bgcolor: '#f9f9f9' }}>
                <TableRow>
                  <TableCell padding="checkbox">Select</TableCell>
                  <TableCell>Produs</TableCell>
                  <TableCell align="center">Cantitate</TableCell>
                  <TableCell align="right">Preț</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(items) && items.map((item) => {                  
                  const limit = getRefundLimit(item);
                  const isFullyRefunded = limit <= 0;
                  
                  const currentQty = refundMap[item.id] || 0;
                  const isSelected = currentQty > 0;
                  
                  return (
                    <TableRow 
                        key={item.id} 
                        hover 
                        selected={isSelected}
                        sx={{ 
                            opacity: isFullyRefunded ? 0.5 : 1, 
                            bgcolor: isFullyRefunded ? '#fafafa' : 'inherit' 
                        }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox 
                          checked={isSelected}
                          onChange={() => handleToggleCheck(item)}
                          color="error"
                          disabled={isFullyRefunded}
                        />
                      </TableCell>
                      
                      <TableCell sx={{ overflow: 'hidden' }}>
                          <Box display="flex" flexDirection="column">
                              <Typography variant="body2" noWrap fontWeight={isSelected ? 'bold' : 'normal'}>
                                  {item.productName}
                              </Typography>
                              
                              <Box display="flex" gap={1} alignItems="center">
                                  {isFullyRefunded ? (
                                    <Typography variant="caption" sx={{color: 'orange', fontWeight: 'bold'}}>
                                        STORNAT COMPLET
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                        Disponibil: <b>{limit}</b> / {item.quantity} buc
                                    </Typography>
                                  )}
                              </Box>
                          </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <IconButton 
                                size="small" color="error" 
                                onClick={() => handleDecrement(item)}
                                disabled={currentQty === 0}
                            >
                                <RemoveCircleOutlineIcon fontSize="small" />
                            </IconButton>
                            
                            <Typography sx={{ width: 24, textAlign: 'center', fontWeight: 'bold' }}>
                                {currentQty}
                            </Typography>
                            
                            <IconButton 
                                size="small" color="success" 
                                onClick={() => handleIncrement(item)}
                                disabled={currentQty >= limit || isFullyRefunded}
                            >
                                <AddCircleOutlineIcon fontSize="small" />
                            </IconButton>
                        </Box>
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                         {isSelected ? (item.unitPrice * currentQty).toFixed(2) : '0.00'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        {/* Rând 1: Plăți originale (stânga) + Selector (dreapta) */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Plăți originale: {Array.isArray(originalPayments) && originalPayments.length > 0 
                    ? originalPayments.map(p => `${p.paymentMethodName}: ${p.amount.toFixed(2)} RON`).join(', ')
                    : 'Necunoscute'}
            </Typography>

            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '300px' } }}>
                <InputLabel>Selectează metoda restituire</InputLabel>
                <Select
                    value={paymentMethodId}
                    label="Selectează metoda restituire"
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                >
                    {Array.isArray(paymentMethods) && paymentMethods.map((method) => (
                        <MenuItem key={method.id} value={method.id}>
                            {method.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>

        {/* Rând 2: Total restituit */}
        <Box>
            <Typography variant="h6">
                Total Restituit: <span style={{ color: 'red' }}>{totalRefundAmount.toFixed(2)} RON</span>
            </Typography>
        </Box>

        {/* Rând 3: Butoane */}
        <DialogActions sx={{ p: 0, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} color="inherit">Anulează</Button>
            <Button 
                variant="contained" 
                color="error" 
                startIcon={submitting ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                disabled={!hasSelection || submitting || !paymentMethodId}
                onClick={handleSubmitRefund}
            >
                {submitting ? 'Se procesează...' : 'Confirmă Retur'}
            </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default RefundModal;