import React from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { Navigate, useNavigate } from 'react-router-dom';

import { useSellPage } from '../hooks/useSellPage';

import ReceiptCard from '../components/receipt/ReceiptCard';
import AddReceiptModal from '../components/modals/AddReceiptModal';
import CashAdvanceModal from '../components/modals/CashAdvanceModal';
import GiftCardModal from '../components/modals/GiftCardModal';
import OpenedReceiptCard from '../components/receipt/OpenedReceiptCard';
import AddPaymentModal from '../components/modals/AddPaymentModal';
import CancelReceiptModal from '../components/modals/CancelReceiptModal';
import VoucherIssuanceDialog from '../components/modals/VoucherIssuanceDialog';
import FiscalModal from '../components/modals/FiscalModal';

const SellPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const {
    receiptId,
    warehouses,
    receipts,
    editingReceipt,
    paymentMethods,
    cancelReasons,
    loading,
    modals,
    toggleModal,
    feedback,
    error,
    getFriendlyErrorMessage,
    actions,
    voucherIssuance,
    giftCardStatus,
    fiscalStatus,
    askPrintedReceipt,
    user,
  } = useSellPage();

  // Loading / Redirect pentru bonul deschis
  if (receiptId) {
    if (loading.receipts !== 'succeeded' && !editingReceipt) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (!editingReceipt) {
      return <Navigate to="/home/sell" replace />;
    }
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%' }}>

      {/* --- SCENARIU 1: BON DESCHIS --- */}
      {editingReceipt ? (
        <OpenedReceiptCard
          receipt={editingReceipt}
          warehouses={warehouses}
          onBack={actions.backToDashboard}
          onAddPayment={() => toggleModal('addPayment', true)}
          onAddProduct={actions.addProduct}
          onUpdateItem={actions.updateItemQuantity}
          onRemoveItem={actions.removeItem}          
          error={error}
          onClearError={actions.clearError}
          getFriendlyErrorMessage={getFriendlyErrorMessage}
          onCancelReceipt={() => toggleModal('cancel', true)}
        />
      ) : (
        /* --- SCENARIU 2: LISTĂ BONURI (DASHBOARD) --- */
        <>
          <Box sx={{ py: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => toggleModal('addReceipt', true)}
              size={isSmallScreen ? 'small' : 'medium'}
            >
              Adaugă Bon
            </Button>
            <Button
              variant="outlined"
              startIcon={<PaymentsIcon />}
              onClick={() => toggleModal('advance', true)}
              size={isSmallScreen ? 'small' : 'medium'}
            >
              Încasează Avans
            </Button>
            {giftCardStatus?.active && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<CardGiftcardIcon />}
                onClick={() => toggleModal('giftCard', true)}
                size={isSmallScreen ? 'small' : 'medium'}
              >
                Vinde Card Cadou
              </Button>
            )}
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<PointOfSaleIcon />}
              onClick={() => toggleModal('fiscal', true)}
              size={isSmallScreen ? 'small' : 'medium'}
            >
              Casa de Marcat
            </Button>
          </Box>

          <Box sx={{ p: 1 }}>
            {loading.receipts === 'pending' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {loading.receipts === 'succeeded' && receipts.length === 0 && (
              <Typography color="text.secondary" textAlign="center" mt={4}>
                Nu există bonuri active.
              </Typography>
            )}

            {loading.receipts === 'succeeded' && receipts.length > 0 && (
              <Grid container spacing={2}>
                {receipts.map((receipt) => (
                  <Grid key={receipt.id}>
                    <ReceiptCard receipt={receipt} onClick={actions.openReceipt} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </>
      )}

      {/* --- MODALE --- */}
      <AddReceiptModal
        open={modals.addReceipt}
        onClose={() => toggleModal('addReceipt', false)}
        onSubmit={actions.createReceipt}
      />

      <CashAdvanceModal
        open={modals.advance}
        onClose={() => toggleModal('advance', false)}
        onSubmit={actions.createAdvance}
        paymentMethods={paymentMethods}
        warehouses={warehouses}
        loading={loading.paymentMethods === 'pending'}
      />

      <GiftCardModal
        open={modals.giftCard}
        onClose={() => toggleModal('giftCard', false)}
        onSubmit={actions.createGiftCard}
        paymentMethods={paymentMethods}
        warehouses={warehouses}
        loading={loading.paymentMethods === 'pending'}
      />

      {voucherIssuance && (
        <VoucherIssuanceDialog
          issuance={voucherIssuance}
          onDismiss={actions.dismissVoucherIssuance}
          cashierId={user?.id}
        />
      )}

      {editingReceipt && (
        <AddPaymentModal
          open={modals.addPayment}
          onClose={() => toggleModal('addPayment', false)}
          receipt={editingReceipt}
          paymentMethods={paymentMethods}
          onAddPayment={actions.addPayment}
          onApplyVoucher={actions.applyVoucher}
          onRemovePayment={actions.removePayment}
          onCloseReceipt={actions.closeReceipt}
          onCloseReceiptManual={actions.closeReceiptManual}
          fiscalStatus={fiscalStatus}
          loading={loading.receipts === 'pending' || loading.paymentMethods === 'pending'}
        />
      )}

      {/* Starea bonului la casă nu poate fi decisă acum (Fisco inaccesibil / job în lucru).
          „Verifică și reia" e sigură: backend-ul retrimite DOAR cu dovadă că bonul nu a ieșit.
          Confirmarea manuală rămâne doar pentru cazul în care casierul vede bonul tipărit. */}
      <Dialog open={!!askPrintedReceipt} maxWidth="xs" fullWidth>
        <DialogTitle>Bon fiscal în așteptare</DialogTitle>
        <DialogContent>
          <Typography>
            Casa de marcat nu a confirmat încă tipărirea bonului pentru{' '}
            <strong>{askPrintedReceipt?.tableName}</strong>.{' '}
            „Verifică și reia" interoghează casa și retrimite doar dacă e sigur că bonul nu a
            ieșit. Confirmă manual doar dacă vezi bonul tipărit fizic.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="success"
            variant="outlined"
            onClick={() => actions.confirmBonPrinted(askPrintedReceipt.id)}
          >
            Văd bonul tipărit
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => actions.retryBonNotPrinted(askPrintedReceipt.id)}
          >
            Verifică și reia
          </Button>
        </DialogActions>
      </Dialog>

      <CancelReceiptModal
        open={modals.cancel}
        onClose={() => toggleModal('cancel', false)}
        onConfirm={actions.cancelReceipt}
        reasons={cancelReasons}
        loading={loading.cancelReasons === 'pending'}
      />

      <FiscalModal
        open={!!modals.fiscal}
        onClose={() => toggleModal('fiscal', false)}
        fiscalStatus={fiscalStatus}
      />

      {/* --- FEEDBACK (SNACKBAR) --- */}
      <Snackbar
        open={!!feedback.message}
        autoHideDuration={4000}
        onClose={actions.clearFeedback}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: 90, sm: 110 } }}
      >
        <Alert
          onClose={actions.clearFeedback}
          severity={feedback.severity}
          variant="filled"
          sx={{ width: '100%', fontSize: '1rem', fontWeight: 'bold', boxShadow: 3 }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SellPage;