import React from 'react';
import { 
  Box, Typography, Paper, TextField, Button, 
  MenuItem, Divider, IconButton, Stack, Snackbar, Alert, Container 
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import ProductSearch from '../../sales/components/common/ProductSearch';
import { useStockAdjustmentPage } from '../hooks/useStockAdjustmentPage';

const StockAdjustmentPage = ({ warehouseId }) => {
  
  const {
    warehouses,
    currentWarehouseName,
    reasons,
    selectedProduct,
    quantityToDeduct,
    reasonId,
    note,
    loading,
    notification,
    setQuantityToDeduct,
    setReasonId,
    setNote,
    handleProductSelect,
    handleSave,
    handleCloseNotification,
    handleClearProduct
  } = useStockAdjustmentPage(warehouseId);

  return (
    <Container maxWidth="md" sx={{ py: 1 }}>
      <Paper elevation={3} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="h6" textAlign="center" fontWeight="bold" sx={{ mb: 1 }}>
          Ajustare Stoc: {currentWarehouseName}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {!selectedProduct ? (
          <ProductSearch 
            warehouses={warehouses.filter(w => w.id === Number(warehouseId))} 
            onProductSelect={handleProductSelect} 
            onlyTrackStock={true} 
          />
        ) : (
          <Stack spacing={3}>
            {/* 1. PRODUS */}
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="body1">
                <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Produs:</Box>
                <strong>{selectedProduct.name}</strong>
              </Typography>
              <IconButton onClick={handleClearProduct} color="error" size="small">
                <DeleteOutlineIcon />
              </IconButton>
            </Box>

            {/* 2. CANTITATE PIERDERE */}
            <Box display="flex" alignItems="center" justifyContent="center">
              <Typography variant="body2" fontWeight="bold" sx={{ mr: 2 }}>Cantitate pierdută / scăzută:</Typography>
              <IconButton onClick={() => setQuantityToDeduct(Math.max(1, quantityToDeduct - 1))} color="primary">
                <RemoveCircleOutlineIcon />
              </IconButton>
              <Typography sx={{ mx: 2, fontWeight: 'bold', minWidth: 20, textAlign: 'center', fontSize: '1.2rem' }}>
                {quantityToDeduct}
              </Typography>
              <IconButton onClick={() => setQuantityToDeduct(quantityToDeduct + 1)} color="primary">
                <AddCircleOutlineIcon />
              </IconButton>
            </Box>

            {/* 3. MOTIV */}
            <TextField
              select 
              label="Selectează motivul scăderii" 
              fullWidth
              value={reasonId} 
              onChange={(e) => setReasonId(e.target.value)}
              error={!reasonId && loading}
            >
              <MenuItem value="" disabled>
                <em>Alege motivul scăderii</em>
              </MenuItem>
              {reasons.map((r) => <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>)}
            </TextField>

            {/* 4. OBSERVATII */}
            <TextField
              label="Observații" multiline rows={2} fullWidth
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Detalii despre ajustare..."
            />

            <Button 
              variant="contained" startIcon={<SaveIcon />} onClick={handleSave} 
              disabled={loading} fullWidth size="large" sx={{ fontWeight: 'bold', py: 1.5 }}
            >
              {loading ? "SE PROCESEAZĂ..." : "CONFIRMĂ AJUSTAREA"}
            </Button>
          </Stack>
        )}
      </Paper>

      <Snackbar 
        open={notification.open} autoHideDuration={3000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={notification.severity} variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StockAdjustmentPage;