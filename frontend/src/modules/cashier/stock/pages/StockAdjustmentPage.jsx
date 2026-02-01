import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, 
  MenuItem, Divider, IconButton, Stack, Snackbar, Alert, Container 
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSelector } from 'react-redux';

import ProductSearch from '../../sales/components/common/ProductSearch';
import { StockAdjustmentService } from '../api/StockAdjustmentService';
import { SearchProductService } from '../../sales/api/SearchProductService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const StockAdjustmentPage = ({ warehouseId }) => {
  const { user } = useSelector((state) => state.auth);
  const { warehouses } = useSelector((state) => state.cashier);
  
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [reasons, setReasons] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToDeduct, setQuantityToDeduct] = useState(1);
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const currentWarehouseName = warehouses?.find(w => w.id === Number(warehouseId))?.name || "Gestiune";

  useEffect(() => {
    const loadReasons = async () => {
      try {
        const data = await StockAdjustmentService.getActiveReasons();
        setReasons(data);
      } catch (err) {
        setNotification({ open: true, message: getFriendlyErrorMessage(err), severity: 'error' });
      }
    };
    loadReasons();
  }, []);

  const handleProductSelect = async (productId) => {
    try {
      const results = await SearchProductService.searchProductsByName(""); 
      const fullProduct = results.find(p => p.id === productId);
      setSelectedProduct(fullProduct || { id: productId, name: `Produs #${productId}` });
    } catch (err) {
      setSelectedProduct({ id: productId, name: `Produs #${productId}` });
    }
  };

  const handleSave = async () => {
    if (!reasonId) {
      setNotification({ open: true, message: "Selectează motivul scăderii!", severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await StockAdjustmentService.createAdjustment({
        warehouseId, productId: selectedProduct.id, userId: user.id,
        reasonId, quantityChange: quantityToDeduct * -1, note
      });
      setNotification({ open: true, message: "Ajustare salvată cu succes.", severity: 'success' });
      setSelectedProduct(null); setNote(''); setQuantityToDeduct(1); setReasonId('');
    } catch (err) {
      setNotification({ open: true, message: getFriendlyErrorMessage(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 1 }}>
      <Paper elevation={3} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="h6" textAlign="center" fontWeight="bold" sx={{ mb: 1 }}>
          Ajustare Stoc: {currentWarehouseName}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {!selectedProduct ? (
          <ProductSearch warehouseId={warehouseId} onProductSelect={handleProductSelect} onlyTrackStock={true} />
        ) : (
          <Stack spacing={3}>
            {/* 1. PRODUS */}
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="body1">
                <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Produs:</Box>
                <strong>{selectedProduct.name}</strong>
              </Typography>
              <IconButton onClick={() => setSelectedProduct(null)} color="error" size="small">
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
        onClose={() => setNotification({ ...notification, open: false })}
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