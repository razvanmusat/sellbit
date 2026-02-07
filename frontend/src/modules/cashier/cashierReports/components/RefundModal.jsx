import React, { useState, useEffect } from 'react';
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

import { useSelector } from 'react-redux';
import { ReceiptItemService } from '../../sales/api/ReceiptItemService';
import { SalesService } from '../../sales/api/SalesService';
import { PaymentService } from '../../sales/api/PaymentService';

const RefundModal = ({ open, onClose, receipt, onRefundSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); 

  const [items, setItems] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [refundMap, setRefundMap] = useState({});
  const [paymentMethodId, setPaymentMethodId] = useState(''); 

  const { user } = useSelector((state) => state.auth); 

  useEffect(() => {
    if (open && receipt?.id) {
      setRefundMap({});
      setPaymentMethodId(''); 
      setError(null);
      fetchInitialData();
    }
  }, [open, receipt]);

  const fetchInitialData = async () => {
    setLoadingItems(true);
    try {
      const itemsData = await ReceiptItemService.getItemsByReceipt(receipt.id);
      // Validare defensivă
      if (Array.isArray(itemsData)) {
          setItems(itemsData);
      } else {
          setItems([]);
      }

      const methodsData = await PaymentService.getActivePaymentMethods();
      if (Array.isArray(methodsData)) {
          const allowedCodes = ['CASH', 'CARD', 'BANK_TRANSFER'];
          const filteredMethods = methodsData.filter(method => allowedCodes.includes(method.code));
          setPaymentMethods(filteredMethods);
      }
    } catch (err) {
      console.error("Eroare date:", err);
      setError("Nu s-au putut încărca datele bonului.");
    } finally {
      setLoadingItems(false);
    }
  };

  // --- LOGICA NOUĂ: Folosim remainingQuantity ---

  const getRefundLimit = (item) => {
      // Dacă backend-ul trimite remainingQuantity, îl folosim. Altfel fallback la quantity.
      return item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity;
  };

  const handleIncrement = (item) => {
    const limit = getRefundLimit(item); // <--- Limita e acum 4, nu 5
    const currentQty = refundMap[item.id] || 0;
    
    if (currentQty < limit) {
      setRefundMap(prev => ({ ...prev, [item.id]: currentQty + 1 }));
    }
  };

  const handleDecrement = (item) => {
    const currentQty = refundMap[item.id] || 0;
    if (currentQty > 0) {
      if (currentQty - 1 === 0) {
        const newMap = { ...refundMap };
        delete newMap[item.id];
        setRefundMap(newMap);
      } else {
        setRefundMap(prev => ({ ...prev, [item.id]: currentQty - 1 }));
      }
    }
  };

  const handleToggleCheck = (item) => {
    const limit = getRefundLimit(item); // <--- Selectăm maximul DISPONIBIL (4)

    // Dacă produsul e deja returnat complet (limit 0), nu facem nimic
    if (limit <= 0) return;

    if (refundMap[item.id]) {
      const newMap = { ...refundMap };
      delete newMap[item.id];
      setRefundMap(newMap);
    } else {
      setRefundMap(prev => ({ ...prev, [item.id]: limit }));
    }
  };

  const handleSubmitRefund = async () => {
    if (!paymentMethodId) {
      setError("Te rog selectează metoda de restituire.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const itemsPayload = Object.entries(refundMap).map(([itemId, qty]) => ({
        receiptItemId: parseInt(itemId),
        quantityToRefund: parseFloat(qty)
      }));

      const request = {
        userId: user?.id,
        paymentMethodId: paymentMethodId,
        items: itemsPayload
      };

      await SalesService.createPartialRefund(receipt.id, request);
      onRefundSuccess(); 
      onClose(); 
    } catch (err) {
      const msg = err.response?.data?.message || "Eroare la retur.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalRefundAmount = items.reduce((acc, item) => {
    if (refundMap[item.id]) {
        return acc + (item.unitPrice * refundMap[item.id]);
    }
    return acc;
  }, 0);

  const hasSelection = Object.keys(refundMap).length > 0;

  return (
    <Dialog 
        open={open} 
        onClose={onClose} 
        fullScreen={isMobile} 
        maxWidth="md" 
        fullWidth
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
                              
                              {/* AICI AFIȘĂM CORECT: Disponibil vs Total */}
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
                                // AICI BLOCĂM BUTONUL PLUS la limită (4)
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
        
        <Box display="flex" justifyContent="center" width="100%">
            <FormControl size="small" sx={{ width: { xs: '100%', sm: '300px' } }}>
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

        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Typography variant="h6">
                Total Restituit: <span style={{ color: 'red' }}>{totalRefundAmount.toFixed(2)} RON</span>
            </Typography>

            <DialogActions sx={{ p: 0 }}>
                <Button onClick={onClose} color="inherit">Anulează</Button>
                <Button 
                    variant="contained" 
                    color="error" 
                    startIcon={submitting ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                    disabled={!hasSelection || submitting || !paymentMethodId}
                    onClick={handleSubmitRefund}
                >
                    Confirmă Retur
                </Button>
            </DialogActions>
        </Box>
      </Box>
    </Dialog>
  );
};

export default RefundModal;