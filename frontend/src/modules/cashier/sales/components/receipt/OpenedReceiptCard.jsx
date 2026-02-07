import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  IconButton, 
  useTheme, 
  useMediaQuery, 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CategoryIcon from '@mui/icons-material/Category';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

// Importuri locale
import ProductCard from './ProductCard';
import ProductSearch from '../common/ProductSearch';
import ProductScanner from '../common/ProductScanner';

/**
 * Componenta detaliată pentru un bon deschis.
 */
const OpenedReceiptCard = ({ 
  receipt, 
  onBack, 
  onAddPayment, 
  onAddProduct, 
  onUpdateItem, 
  onRemoveItem, 
  onCancelReceipt 
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate(); 
  
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // --- HANDLER NAVIGARE ---
  const handleTabChange = (event, newValue) => {
    // 1. Dacă utilizatorul apasă pe tab-ul "Categorii" (index 2)
    if (newValue === 2) {
        // 2. Construim parametrii URL (Safe & Bulletproof)
        const params = new URLSearchParams({
            receiptId: receipt.id,
            warehouseId: receipt.warehouseId,
            tableName: receipt.tableName
        }).toString();

        // 3. Facem redirect către pagina Full Screen cu parametrii în URL
        navigate(`/sales/catalog?${params}`);
        return; // Nu schimbăm tab-ul local, plecăm de pe pagină
    }

    // Altfel, schimbăm tab-ul local (Search / Scan)
    setCurrentTab(newValue);
  };

  const items = (receipt.items || []).filter(item => item != null); 

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: { xs: 1, sm: 2 }, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '85vh', 
        maxHeight: '100%',
        borderRadius: { xs: 0, sm: 2 } 
      }}
    >
      {/* --- HEADER --- */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
        <IconButton onClick={onBack} size={isSmallScreen ? "small" : "medium"}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography 
            variant={isSmallScreen ? "h6" : "h5"} 
            fontWeight="bold" 
            sx={{ ml: 1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {receipt.tableName}
        </Typography>

        <IconButton 
            onClick={onCancelReceipt} 
            color="error" 
            size={isSmallScreen ? "small" : "medium"}
            sx={{ border: '1px solid rgba(211, 47, 47, 0.3)', ml: 1 }}
        >
            <DeleteForeverIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* --- TABS --- */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            variant="fullWidth" 
            textColor="primary"
            indicatorColor="primary"
        >
          <Tab icon={<SearchIcon />} label={isSmallScreen ? "Caută" : "Căutare"} iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<QrCodeScannerIcon />} label={isSmallScreen ? "Scan" : "Scanare"} iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<CategoryIcon />} label={isSmallScreen ? "Categ" : "Categorii"} iconPosition="start" sx={{ minHeight: 48 }} />
        </Tabs>
      </Box>

      {/* --- CONTENT ZONA ACTIVĂ --- */}
      <Box sx={{ my: 2, position: 'relative', zIndex: 10 }}>
        
        {/* TAB 0: CĂUTARE */}
        {currentTab === 0 && (
            <ProductSearch 
                onProductSelect={onAddProduct} 
                warehouseId={receipt.warehouseId} 
            />
        )}
        
        {/* TAB 1: SCANARE */}
        {currentTab === 1 && (
            <ProductScanner 
                onProductSelect={onAddProduct} 
            />
        )}
        
        {/* TAB 2: CATEGORII */}
        {currentTab === 2 && (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                Se încarcă catalogul...
            </Typography>
        )}
      </Box>

      {/* --- LISTA DE PRODUSE --- */}
      <Box 
        sx={{ 
            flex: 1, 
            overflowY: 'auto',
            
            // --- FIX PENTRU LAYOUT SHIFT ---
            // Această proprietate rezervă spațiul barei de scroll mereu, 
            // chiar dacă bara nu este vizibilă.
            scrollbarGutter: 'stable', 
            
            my: 1,
            pr: 0.5, 
            bgcolor: items.length === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
            borderRadius: 1
        }}
      >
        {items.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary">
            <Typography variant="body1">Bonul este gol.</Typography>
            <Typography variant="caption">Caută sau scanează un produs.</Typography>
          </Box>
        ) : (
          items.map((item) => (
            <ProductCard
              key={item.receiptItemId} 
              item={item}
              onQuantityChange={(productId, newQuantity) => onUpdateItem(receipt.id, productId, newQuantity)}
              onRemove={() => onRemoveItem(item.receiptItemId)} 
            />
          ))
        )}
      </Box>

      {/* --- FOOTER --- */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="text.secondary">TOTAL:</Typography>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            {receipt.totalAmount.toFixed(2)} <Typography component="span" variant="h6" color="text.secondary">RON</Typography>
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          onClick={() => onAddPayment()}
          disabled={items.length === 0} 
          sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
        >
          {items.length === 0 ? "Adaugă produse" : "ÎNCASARE / PLĂȚI"}
        </Button>
      </Box>
    </Paper>
  );
};

OpenedReceiptCard.propTypes = {
  receipt: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onAddPayment: PropTypes.func.isRequired,
  onAddProduct: PropTypes.func.isRequired,
  onUpdateItem: PropTypes.func.isRequired,
  onRemoveItem: PropTypes.func.isRequired,
  onCancelReceipt: PropTypes.func.isRequired,
};

export default OpenedReceiptCard;