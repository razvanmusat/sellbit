import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Snackbar, Alert, Fab, useTheme, useMediaQuery } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import CategoryBrowser from '../../../../shared/components/catalog/CategoryBrowser';
import { ReceiptItemService } from '../api/ReceiptItemService';
// 👇 IMPORTĂM DICTIONARUL
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const SalesCatalogPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Detectăm dacă e mobil
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [searchParams] = useSearchParams();
  const receiptId = useMemo(() => searchParams.get('receiptId'), [searchParams]);
  const warehouseId = useMemo(() => searchParams.get('warehouseId'), [searchParams]);
  const tableName = useMemo(() => searchParams.get('tableName'), [searchParams]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [receiptItems, setReceiptItems] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (receiptId) {
        ReceiptItemService.getItemsByReceipt(receiptId)
            .then(items => { if (isMounted) setReceiptItems(items || []); })
            .catch(err => console.error(err));
    }
    return () => { isMounted = false; };
  }, [receiptId]);

  const handleBackToReceipt = () => {
    if (warehouseId && receiptId) navigate(`/home/sell/${warehouseId}/${receiptId}`);
    else navigate('/home/sell');
  };

  const handleProductSelect = async (product, quantityToAdd = 1) => {
    if (!receiptId) return;

    const existingItem = receiptItems.find(item => item.productId === product.id);
    const oldQty = existingItem ? Number(existingItem.quantity) : 0;
    const totalQuantityToSend = oldQty + quantityToAdd;

    try {
        await ReceiptItemService.addOrUpdateItem(receiptId, product.id, totalQuantityToSend);

        setReceiptItems(prevItems => {
            const index = prevItems.findIndex(item => item.productId === product.id);
            if (index !== -1) {
                const newItems = [...prevItems];
                newItems[index] = { ...newItems[index], quantity: totalQuantityToSend };
                return newItems;
            }
            return [...prevItems, { productId: product.id, quantity: totalQuantityToSend }];
        });

        setSnackbar({ open: true, message: `"${product.name}" total: ${totalQuantityToSend} buc`, severity: 'success' });
    } catch (error) {
        // 👇 AICI FOLOSIM DICTIONARUL
        const msg = getFriendlyErrorMessage(error);
        setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  if (!receiptId || !warehouseId) return null;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <CategoryBrowser 
            mode="SALES" 
            warehouseId={Number(warehouseId)} 
            onProductClick={handleProductSelect}
        />
      </Box>

      <Fab 
        variant="extended" 
        color="primary" 
        onClick={handleBackToReceipt}
        sx={{ 
            position: 'fixed', 
            bottom: { xs: 16, sm: 24 }, 
            right: { xs: 16, sm: 24 }, 
            fontWeight: 'bold',
            zIndex: 1300,
            boxShadow: 6,
            px: { xs: 2, sm: 4 },
            height: { xs: 48, sm: 56 }
        }}
      >
        {isMobile ? <ArrowBackIcon sx={{ mr: 1 }} /> : <CheckCircleIcon sx={{ mr: 1 }} />}
        {isMobile ? "Înapoi" : `Înapoi la Bon (${tableName})`}
      </Fab>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={1500} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: 60, sm: 100 }, width: '100%' }} 
      >
        <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity} 
            variant="filled" 
            sx={{ 
                width: { xs: '90%', sm: 'auto' }, 
                fontSize: { xs: '1rem', sm: '1.2rem' },
                fontWeight: 'bold', 
                boxShadow: 4,
                mx: 'auto'
            }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default SalesCatalogPage;