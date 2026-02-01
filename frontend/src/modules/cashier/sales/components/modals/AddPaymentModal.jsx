import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, FormControl, InputLabel, Select, MenuItem, Box,
  TextField, List, ListItem, ListItemText, IconButton, Divider, Chip, Alert, CircularProgress, Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

import { usePaymentModal } from '../../hooks/usePaymentModal';

const AddPaymentModal = (props) => {
  const { 
    open, onClose, receipt, paymentMethods, loading 
  } = props;

  const {
    amount, setAmount,
    voucherCode, setVoucherCode,
    paymentMethodId, setPaymentMethodId,
    changeDue,    
    lastChange,   
    localPayments,
    isInitialLoading,
    toastOpen, toastMessage, toastSeverity, handleCloseToast, // Luăm toastSeverity
    totalPaid, remainingAmount, isFullyPaid, isVoucher,
    handleAmountChange, handleRemove, handleSubmit
  } = usePaymentModal(props);

  const displayChange = changeDue > 0 ? changeDue : lastChange;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      
      <DialogTitle sx={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          minHeight: '72px', 
          bgcolor: '#fff', 
          color: 'inherit'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon fontSize="large" color="primary"/>
          <Typography variant="h6" fontWeight="bold">Adaugă Plată</Typography>
        </Box>
        <Chip label={`Total: ${receipt.totalAmount.toFixed(2)} Lei`} color="primary" sx={{ fontWeight: 'bold' }} />
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ 
            mb: 2, p: 2, 
            bgcolor: isFullyPaid ? '#e8f5e9' : '#fff3e0',
            borderRadius: 2, border: '1px solid', 
            borderColor: isFullyPaid ? '#a5d6a7' : '#ffe0b2',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Achitat:</Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">{isInitialLoading ? "..." : `${totalPaid.toFixed(2)} Lei`}</Typography>
          </Box>
          <Divider sx={{ my: 1 }}/>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight="bold">RĂMAS:</Typography>
            <Typography variant="h4" fontWeight="bold" color={isFullyPaid ? 'success.main' : 'error.main'}>{isInitialLoading ? "..." : `${remainingAmount.toFixed(2)} Lei`}</Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>PLĂȚI EFECTUATE:</Typography>
            <Box sx={{ 
                height: '130px', overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, bgcolor: '#fafafa',
                display: 'flex', flexDirection: 'column', justifyContent: (localPayments.length === 0 && !isInitialLoading) ? 'center' : 'flex-start'
            }}>
                {isInitialLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress size={24} /></Box>
                ) : localPayments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" align="center">Nu există plăți înregistrate.</Typography>
                ) : (
                    <List dense sx={{ p: 0 }}>
                    {localPayments.map((payment, index) => (
                        <React.Fragment key={payment.id}>
                        <ListItem secondaryAction={
                            <IconButton edge="end" aria-label="delete" color="error" onClick={() => handleRemove(payment.id)} disabled={loading}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        }>
                            <ListItemText primary={<Typography fontWeight="600" variant="body2">{payment.paymentMethodName}</Typography>} />
                            <Typography fontWeight="bold" color="primary" variant="body1">{payment.amount.toFixed(2)} Lei</Typography>
                        </ListItem>
                        {index < localPayments.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                    </List>
                )}
            </Box>
        </Box>

        <Box sx={{ minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!isFullyPaid ? (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <FormControl fullWidth sx={{ flex: 1 }}>
                  <InputLabel>Metodă Plată</InputLabel>
                  <Select value={paymentMethodId} label="Metodă Plată" onChange={(e) => setPaymentMethodId(e.target.value)} disabled={loading}>
                    <MenuItem value="" disabled><em>Alege metoda...</em></MenuItem>
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.id} value={method.id}>{method.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {isVoucher ? (
                    <TextField 
                        label="Cod Voucher" fullWidth sx={{ flex: 1 }} value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} disabled={loading} 
                        slotProps={{ input: { endAdornment: <ConfirmationNumberIcon color="action" /> } }} placeholder="COD..." 
                    />
                ) : (
                    <TextField 
                        label="Sumă" type="number" fullWidth sx={{ flex: 1 }} value={amount} onChange={handleAmountChange} onFocus={(e) => e.target.select()} disabled={loading} 
                        slotProps={{ input: { endAdornment: <Typography variant="caption" sx={{ ml: 1 }}>RON</Typography> } }}
                     />
                )}
              </Box>
            ) : (
                <Alert severity="success" variant="standard" sx={{ justifyContent: 'center', border: '1px dashed #2e7d32' }}>
                     <Typography variant="body1" fontWeight="bold">Plată finalizată cu succes.</Typography>
                </Alert>
            )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5' }}>
        <Button onClick={onClose} color="inherit" variant="outlined" disabled={loading}>Înapoi</Button>
        
        {displayChange > 0 && !isVoucher && (
             <Typography variant="h5" color="error" fontWeight="bold" sx={{ whiteSpace: 'nowrap', mx: 2 }}>
                REST: {displayChange.toFixed(2)} LEI
             </Typography>
        )}

        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color={isFullyPaid ? "success" : "primary"}
          size="large"
          disabled={loading || (!isFullyPaid && (!paymentMethodId || (isVoucher && !voucherCode) || (!isVoucher && (!amount || parseFloat(amount) <= 0.01))))}
          sx={{ minWidth: 200, fontWeight: 'bold', fontSize: '1rem', py: 1 }}
          startIcon={isFullyPaid ? <CheckCircleIcon /> : (isVoucher ? <ConfirmationNumberIcon /> : <AttachMoneyIcon />)}
        >
          {loading ? 'Procesare...' : (isFullyPaid ? 'ÎNCHIDE BONUL' : (isVoucher ? 'APLICĂ VOUCHER' : 'ADAUGĂ PLATĂ'))}
        </Button>
      </DialogActions>

      <Snackbar
        open={toastOpen}
        autoHideDuration={2000} // L-am făcut puțin mai scurt (2 sec) ca să nu stea mult pe ecran
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {/* Folosim severity dinamic: success (verde) sau warning (galben) */}
        <Alert onClose={handleCloseToast} severity={toastSeverity} variant="filled" sx={{ width: '100%', fontSize: '1rem', fontWeight: 'bold', boxShadow: 3 }}>
            {toastMessage}
        </Alert>
      </Snackbar>

    </Dialog>
  );
};

AddPaymentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  receipt: PropTypes.object.isRequired,
  paymentMethods: PropTypes.array.isRequired,
  onAddPayment: PropTypes.func.isRequired,
  onApplyVoucher: PropTypes.func.isRequired,
  onRemovePayment: PropTypes.func.isRequired,
  onCloseReceipt: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default AddPaymentModal;