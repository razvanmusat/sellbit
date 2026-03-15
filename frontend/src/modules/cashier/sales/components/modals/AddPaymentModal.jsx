import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, FormControl, InputLabel, Select, MenuItem, Box,
  TextField, List, ListItem, ListItemText, IconButton, Divider, Chip,
  Alert, CircularProgress, Snackbar, Table, TableHead, TableBody,
  TableRow, TableCell
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StoreIcon from '@mui/icons-material/Store';

import { usePaymentModal } from '../../hooks/usePaymentModal';

const AddPaymentModal = (props) => {
  const { open, onClose, receipt, paymentMethods, loading } = props;

  const {
    amount, setAmount,
    voucherPrefix, setVoucherPrefix,
    voucherCode, setVoucherCode,
    activePrefixes,
    paymentMethodId, setPaymentMethodId,
    changeDue,
    lastChange,
    localPayments,
    isInitialLoading,
    toastOpen, toastMessage, toastSeverity, handleCloseToast,
    totalPaid, remainingAmount, isFullyPaid, isVoucher,
    handleAmountChange, handleRemove, handleSubmit,
    isMultiPaymentMode,
    remainingPerWarehouse,
    pickerOpen, pendingPayment, handlePickerSelect, handlePickerClose,
  } = usePaymentModal(props);

  const displayChange = changeDue > 0 ? changeDue : lastChange;

  // Label pentru picker — diferit pentru voucher vs plată normală
  const pendingMethod = paymentMethods.find(m => m.id === pendingPayment?.methodId);
  const pickerTitle = pendingPayment?.voucherCode ? 'Pe ce gestiune se aplică voucherul?' : 'Pe ce gestiune?';
  const pickerSubtitle = pendingPayment?.voucherCode
    ? `Voucher — ${pendingPayment.amount.toFixed(2)} RON`
    : pendingMethod
      ? `${pendingMethod.label} — ${pendingPayment?.amount?.toFixed(2)} RON`
      : '';

  return (
    <>
      {/* ============================================================
          MODAL PRINCIPAL
      ============================================================ */}
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>

        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '72px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon fontSize="large" color="primary" />
            <Typography variant="h6" fontWeight="bold">Adaugă Plată</Typography>
          </Box>
          <Chip label={`Total: ${receipt.totalAmount.toFixed(2)} Lei`} color="primary" sx={{ fontWeight: 'bold' }} />
        </DialogTitle>

        <DialogContent dividers>

          {/* SUMAR GLOBAL */}
          <Box sx={{
            mb: 2, p: 2,
            bgcolor: isFullyPaid ? '#e8f5e9' : '#fff3e0',
            borderRadius: 2, border: '1px solid',
            borderColor: isFullyPaid ? '#a5d6a7' : '#ffe0b2',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Achitat:</Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {isInitialLoading ? '...' : `${totalPaid.toFixed(2)} Lei`}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight="bold">RĂMAS:</Typography>
              <Typography variant="h4" fontWeight="bold" color={isFullyPaid ? 'success.main' : 'error.main'}>
                {isInitialLoading ? '...' : `${remainingAmount.toFixed(2)} Lei`}
              </Typography>
            </Box>
          </Box>

          {/* SOLD PER GESTIUNE */}
          {isMultiPaymentMode && remainingPerWarehouse.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
                SOLD PER GESTIUNE:
              </Typography>
              <Table size="small" sx={{ border: '1px solid #eee', borderRadius: 1 }}>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Gestiune</TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Total</TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Achitat</TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>Rămas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {remainingPerWarehouse.map(wh => (
                    <TableRow key={wh.warehouseId} sx={{ bgcolor: wh.remaining <= 0 ? '#f1f8f1' : 'inherit' }}>
                      <TableCell sx={{ py: 0.5, fontSize: '0.8rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StoreIcon fontSize="small" color={wh.remaining <= 0 ? 'success' : 'action'} />
                          {wh.warehouseName}
                          {wh.remaining <= 0 && <CheckCircleIcon fontSize="small" color="success" />}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem' }}>{wh.total.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem', color: 'success.main' }}>{wh.paid.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem', fontWeight: 'bold', color: wh.remaining <= 0 ? 'success.main' : 'error.main' }}>
                        {wh.remaining.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* PLĂȚI EFECTUATE */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
              PLĂȚI EFECTUATE:
            </Typography>
            <Box sx={{
              height: '130px', overflowY: 'auto', border: '1px solid #eee',
              borderRadius: 1, bgcolor: '#fafafa',
              display: 'flex', flexDirection: 'column',
              justifyContent: localPayments.length === 0 && !isInitialLoading ? 'center' : 'flex-start',
            }}>
              {isInitialLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress size={24} />
                </Box>
              ) : localPayments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" align="center">
                  Nu există plăți înregistrate.
                </Typography>
              ) : (
                <List dense sx={{ p: 0 }}>
                  {localPayments.map((payment, index) => (
                    <React.Fragment key={payment.id}>
                      <ListItem secondaryAction={
                        <IconButton edge="end" color="error" onClick={() => handleRemove(payment.id)} disabled={loading}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }>
                        <ListItemText
                          primary={<Typography fontWeight="600" variant="body2">{payment.paymentMethodLabel}</Typography>}
                        />
                        <Typography fontWeight="bold" color="primary" variant="body1">
                          {payment.amount.toFixed(2)} Lei
                        </Typography>
                      </ListItem>
                      {index < localPayments.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          </Box>

          {/* INPUT PLATĂ */}
          <Box sx={{ minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!isFullyPaid ? (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <FormControl fullWidth sx={{ flex: 1 }}>
                  <InputLabel>Metodă Plată</InputLabel>
                  <Select value={paymentMethodId} label="Metodă Plată"
                    onChange={e => setPaymentMethodId(e.target.value)} disabled={loading}>
                    <MenuItem value="" disabled><em>Alege metoda...</em></MenuItem>
                    {paymentMethods.map(method => (
                      <MenuItem key={method.id} value={method.id}>{method.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {isVoucher ? (
                  <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Prefix</InputLabel>
                      <Select value={voucherPrefix} label="Prefix"
                        onChange={e => setVoucherPrefix(e.target.value)}
                        disabled={loading || activePrefixes.length === 1}>
                        <MenuItem value="" disabled><em>Alege...</em></MenuItem>
                        {activePrefixes.map((prefix, idx) => (
                          <MenuItem key={idx} value={prefix}>{prefix}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Cod Voucher" fullWidth value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                      disabled={loading} autoComplete="off" sx={{ minWidth: 160 }}
                      slotProps={{ input: { endAdornment: <ConfirmationNumberIcon color="action" /> } }}
                      placeholder="Ex: A4B7"
                    />
                  </Box>
                ) : (
                  <TextField
                    label="Sumă" type="number" fullWidth sx={{ flex: 1 }}
                    value={amount} onChange={handleAmountChange}
                    onFocus={e => e.target.select()} disabled={loading} autoComplete="off"
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
            color={isFullyPaid ? 'success' : 'primary'}
            size="large"
            disabled={loading || (!isFullyPaid && (!paymentMethodId ||
              (isVoucher && (!voucherPrefix || !voucherCode)) ||
              (!isVoucher && (!amount || parseFloat(amount) <= 0.01))))}
            sx={{ minWidth: 200, fontWeight: 'bold', fontSize: '1rem', py: 1 }}
            startIcon={isFullyPaid ? <CheckCircleIcon /> : (isVoucher ? <ConfirmationNumberIcon /> : <AttachMoneyIcon />)}
          >
            {loading ? 'Procesare...' : (isFullyPaid ? 'ÎNCHIDE BONUL' : (isVoucher ? 'APLICĂ VOUCHER' : 'ADAUGĂ PLATĂ'))}
          </Button>
        </DialogActions>

        <Snackbar open={toastOpen} autoHideDuration={2000} onClose={handleCloseToast}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={handleCloseToast} severity={toastSeverity} variant="filled"
            sx={{ width: '100%', fontSize: '1rem', fontWeight: 'bold', boxShadow: 3 }}>
            {toastMessage}
          </Alert>
        </Snackbar>
      </Dialog>

      {/* ============================================================
          PICKER GESTIUNE — același pentru plăți normale și voucher
      ============================================================ */}
      <Dialog open={pickerOpen} onClose={handlePickerClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">{pickerTitle}</Typography>
          {pendingPayment && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {pickerSubtitle}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{
            display: 'flex', justifyContent: 'space-between',
            px: 2, py: 1, bgcolor: '#f5f5f5',
            borderBottom: '1px solid', borderColor: 'divider',
          }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">GESTIUNE</Typography>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">DE PLĂTIT</Typography>
          </Box>
          <List disablePadding>
            {remainingPerWarehouse.map(wh => {
              const isWhDone = wh.remaining <= 0.001;
              return (
                <Box key={wh.warehouseId}
                  onClick={() => !isWhDone && handlePickerSelect(wh.warehouseId)}
                  sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
                    cursor: isWhDone ? 'default' : 'pointer',
                    opacity: isWhDone ? 0.5 : 1,
                    bgcolor: isWhDone ? '#f9f9f9' : 'background.paper',
                    '&:hover': !isWhDone ? { bgcolor: 'action.hover' } : {},
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StoreIcon fontSize="small" color={isWhDone ? 'success' : 'primary'} />
                    <Typography variant="body1" fontWeight={isWhDone ? 'normal' : '500'}>{wh.warehouseName}</Typography>
                    {isWhDone && <CheckCircleIcon fontSize="small" color="success" />}
                  </Box>
                  <Typography variant="body1" fontWeight="bold" color={isWhDone ? 'success.main' : 'error.main'}>
                    {isWhDone ? 'ACHITAT' : `${wh.remaining.toFixed(2)} RON`}
                  </Typography>
                </Box>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePickerClose} color="inherit">Anulează</Button>
        </DialogActions>
      </Dialog>
    </>
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
  loading: PropTypes.bool,
};

export default AddPaymentModal;