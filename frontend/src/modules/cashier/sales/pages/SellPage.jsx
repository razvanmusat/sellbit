import React from 'react';
import { Box, CircularProgress, Alert, Button, Grid, Typography, useTheme, useMediaQuery, Snackbar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import { Navigate } from 'react-router-dom';

// Importăm unicul Hook
import { useSellPage } from '../hooks/useSellPage';

// Componente
import WarehouseTabs from '../components/common/WarehouseTabs';
import ReceiptCard from '../components/receipt/ReceiptCard';
import AddReceiptModal from '../components/modals/AddReceiptModal';
import CashAdvanceModal from '../components/modals/CashAdvanceModal';
import OpenedReceiptCard from '../components/receipt/OpenedReceiptCard';
import AddPaymentModal from '../components/modals/AddPaymentModal'; 
import CancelReceiptModal from '../components/modals/CancelReceiptModal';

const SellPage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // 1. Aducem TOT ce avem nevoie din Hook
  const {
    warehouseId,
    receiptId,
    warehouses,
    receipts,
    editingReceipt,
    paymentMethods,
    allPaymentMethods,
    cancelReasons,
    loading,
    modals,
    toggleModal,
    feedback,
    error,
    getFriendlyErrorMessage,
    actions
  } = useSellPage();

  // 2. Loading / Redirect logic
  if (receiptId) {
    if (loading.receipts !== 'succeeded' && !editingReceipt) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    if (!editingReceipt) {
      return <Navigate to={`/home/sell/${warehouseId}`} replace />;
    }
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 2 }, height: '100%' }}>
      
      {/* --- SCENARIU 1: BON DESCHIS --- */}
      {editingReceipt ? (
        <OpenedReceiptCard
          receipt={editingReceipt}
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
          <Box>
            <WarehouseTabs
              warehouses={warehouses}
              selectedWarehouseId={Number(warehouseId) || false}
              onWarehouseChange={actions.changeWarehouse}
            />

            {warehouseId && (
              <Box sx={{ py: 2, display: 'flex', gap: 2 }}>
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
              </Box>
            )}
          </Box>

          <Box sx={{ p: 1 }}>
            {!warehouseId && (
                <Typography color="text.secondary" textAlign="center" mt={4} variant="h6">
                    👆 Alege o gestiune pentru a vedea bonurile deschise.
                </Typography>
            )}

            {warehouseId && loading.receipts === 'pending' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            )}

            {warehouseId && loading.receipts === 'succeeded' && receipts.length === 0 && (
              <Typography color="text.secondary" textAlign="center" mt={4}>
                  Nu există bonuri active pentru gestiunea selectată.
              </Typography>
            )}

            {warehouseId && loading.receipts === 'succeeded' && receipts.length > 0 && (
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
        loading={loading.paymentMethods === 'pending'}
      />
      
      {editingReceipt && (
        <AddPaymentModal
          open={modals.addPayment}
          onClose={() => toggleModal('addPayment', false)}
          receipt={editingReceipt}
          paymentMethods={allPaymentMethods} 
          onAddPayment={actions.addPayment}
          onApplyVoucher={actions.applyVoucher} 
          onRemovePayment={actions.removePayment}
          onCloseReceipt={actions.closeReceipt}
          loading={loading.receipts === 'pending' || loading.allPaymentMethods === 'pending'}
        />
      )}
      
      <CancelReceiptModal 
        open={modals.cancel}
        onClose={() => toggleModal('cancel', false)}
        onConfirm={actions.cancelReceipt}
        reasons={cancelReasons}
        loading={loading.cancelReasons === 'pending'}
      />

      {/* --- FEEDBACK (SNACKBAR) --- */}
      <Snackbar
        open={!!feedback.message}
        autoHideDuration={4000}
        onClose={actions.clearFeedback}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // 1. Poziție: Sus-Centru
        // Adăugăm un pic de spațiu sus ca să nu se suprapună cu Header-ul aplicației
        sx={{ top: { xs: 90, sm: 110 } }} 
      >
        <Alert 
          onClose={actions.clearFeedback} 
          severity={feedback.severity} 
          variant="filled" // 2. Aspect: Colorat plin (ca în modal)
          sx={{ 
            width: '100%', 
            fontSize: '1rem',    // 3. Font mai mare
            fontWeight: 'bold',  // 4. Text îngroșat
            boxShadow: 3         // 5. Umbră pentru efect 3D
          }} 
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SellPage;