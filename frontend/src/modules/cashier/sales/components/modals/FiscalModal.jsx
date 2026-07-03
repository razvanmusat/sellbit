import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Divider, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { FiscalService } from '../../api/FiscalService';
import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';

const FiscalModal = ({ open, onClose, fiscalStatus }) => {
  const [loading, setLoading] = useState(false);
  const [confirmZ, setConfirmZ] = useState(false);
  const [lastReceiptData, setLastReceiptData] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const handleReportX = async () => {
    setLoading(true);
    try {
      await FiscalService.reportX();
      showToast('Raport X tipărit cu succes.');
    } catch (err) {
      showToast(getFriendlyErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReportZ = async () => {
    setConfirmZ(false);
    setLoading(true);
    try {
      await FiscalService.reportZ();
      showToast('Raport Z tipărit. Ziua fiscală a fost închisă.');
    } catch (err) {
      showToast(getFriendlyErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLastReceipt = async () => {
    setLoading(true);
    try {
      const data = await FiscalService.getLastReceipt();
      setLastReceiptData(data);
    } catch (err) {
      showToast(getFriendlyErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setLastReceiptData(null);
    onClose();
  };

  const result = lastReceiptData?.result;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <PointOfSaleIcon fontSize="small" />
          Casa de Marcat
          <FiberManualRecordIcon sx={{
            fontSize: 12,
            ml: 14,
            color: fiscalStatus === true ? '#2e7d32' : fiscalStatus === false ? '#c62828' : '#9e9e9e',
          }} />
          <Typography variant="caption" sx={{
            color: fiscalStatus === true ? '#2e7d32' : fiscalStatus === false ? '#c62828' : 'text.secondary',
            fontWeight: 500,
          }}>
            {fiscalStatus === true ? 'Activă' : fiscalStatus === false ? 'Inactivă' : 'Verificare...'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Raport X */}
            <Box>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={handleReportX}
                disabled={loading}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body1" fontWeight="bold">Raport X</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Verificare situație curentă vânzări — nu închide ziua fiscală
                  </Typography>
                </Box>
              </Button>
            </Box>

            <Divider />

            {/* Ultimul bon emis */}
            <Box>
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<ReceiptLongIcon />}
                onClick={handleGetLastReceipt}
                disabled={loading}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body1" fontWeight="bold">Ultimul Bon Emis</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Număr bon, serie casă și raport Z pentru ultimul bon fiscal înregistrat
                  </Typography>
                </Box>
              </Button>

              {result && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  {result.SlipNumber && (
                    <Typography variant="body2"><strong>Număr bon:</strong> {result.SlipNumber}</Typography>
                  )}
                  {result.nFNum && (
                    <Typography variant="body2"><strong>Bon în ziua fiscală:</strong> {result.nFNum}</Typography>
                  )}
                  {result.nZrep && (
                    <Typography variant="body2"><strong>Raport Z:</strong> {result.nZrep}</Typography>
                  )}
                  {result.DeviceSerial && (
                    <Typography variant="body2"><strong>Serie casă:</strong> {result.DeviceSerial}</Typography>
                  )}
                </Box>
              )}
            </Box>

            <Divider />

            {/* Raport Z */}
            <Box>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<WarningAmberIcon />}
                onClick={() => setConfirmZ(true)}
                disabled={loading}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body1" fontWeight="bold" color="error">Raport Z</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Închide ziua fiscală — irecuperabil după confirmare
                  </Typography>
                </Box>
              </Button>
            </Box>

          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {loading && <CircularProgress size={20} sx={{ mr: 'auto' }} />}
          <Button onClick={handleClose} disabled={loading} color="inherit">Închide</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmare Raport Z */}
      <Dialog open={confirmZ} onClose={() => setConfirmZ(false)} maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningAmberIcon color="error" />
          Confirmare Raport Z
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            <strong>Raportul Z închide ziua fiscală curentă.</strong>
            <br /><br />
            Toate totalurile acumulate de la ultimul Raport Z vor fi memorate definitiv în casa de marcat și nu mai pot fi modificate.
            <br /><br />
            Efectuează Raportul Z <strong>doar la sfârșitul zilei de lucru</strong>, după ce toate bonurile au fost emise.
            <br /><br />
            <Typography component="span" color="error" fontWeight="bold">
              Această acțiune este ireversibilă.
            </Typography>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmZ(false)} autoFocus>Anulează</Button>
          <Button onClick={handleReportZ} variant="contained" color="error">
            Închide Ziua Fiscală
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

FiscalModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fiscalStatus: PropTypes.bool,
};

export default FiscalModal;
