import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  TextField, List, ListItemButton, CircularProgress, Box, Paper, Typography, Divider, useTheme, ClickAwayListener
} from '@mui/material';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'; 
import { StockCurrentService } from '../../../sales/api/StockCurrentService';

import { useProductSearch } from '../../hooks/useProductSearch';

// --- SUB-COMPONENTĂ: STOC LIVE ---
const LiveStockDisplay = ({ warehouseId, productId, trackStock }) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trackStock === false) { setLoading(false); return; }
    if (!warehouseId) { setLoading(false); return; }

    let mounted = true;
    StockCurrentService.getProductStockLive(warehouseId, productId)
       .then(qty => { if(mounted) setStock(Number(qty)); })
       .catch(() => { if(mounted) setStock(0); })
       .finally(() => { if(mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [warehouseId, productId, trackStock]);

  if (trackStock === false) {
      return <Typography variant="caption" color="text.secondary"><AllInclusiveIcon fontSize="small" sx={{ verticalAlign: 'middle', fontSize: '1rem' }} /></Typography>;
  }
  if (loading) return <CircularProgress size={10} thickness={5} />;
  
  const displayVal = stock ?? 0;
  const isOutOfStock = displayVal <= 0.0001; 

  return (
    <Typography variant="caption" fontWeight="bold" sx={{ color: isOutOfStock ? 'error.main' : 'success.main', fontSize: '0.85rem' }}>
      {Number(displayVal).toLocaleString('ro-RO', { maximumFractionDigits: 2 })}
    </Typography>
  );
};

// --- COMPONENTA PRINCIPALĂ MODIFICATĂ ---
// Adăugăm props: showPrice, showStock
const ProductSearch = ({ 
    onProductSelect, 
    warehouseId, 
    onlyTrackStock = false, 
    showPrice = true, // Default TRUE (pentru Vânzare)
    showStock = true  // Default TRUE
}) => {
  const theme = useTheme();
  
  const { 
    query, 
    results, 
    loading, 
    hasSearched, 
    errorMsg, 
    handleQueryChange, 
    clearSearch 
  } = useProductSearch(onlyTrackStock);

  const [selectedIndex, setSelectedIndex] = useState(-1); 
  
  const isNoResults = hasSearched && !loading && results.length === 0 && query.length >= 2 && !errorMsg;

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleClickAway = () => {
    if (results.length > 0 || query.length > 0) {
        clearSearch(); 
    }
  };

  const handleKeyDown = (e) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault(); 
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1)); 
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        handleProductClick(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
        clearSearch();
    }
  };

  const handleProductClick = (product) => {
    onProductSelect(product); // RETURNĂM TOT OBIECTUL PRODUS, NU DOAR ID-UL
    clearSearch();
    setSelectedIndex(-1);
  };

  // --- LOGICĂ DINAMICĂ PENTRU LĂȚIME COLOANE ---
  const getColWidths = () => {
      if (showPrice && showStock) return { name: '70%', price: '20%', stock: '10%' };
      if (showPrice && !showStock) return { name: '80%', price: '20%', stock: '0%' };
      if (!showPrice && showStock) return { name: '85%', price: '0%', stock: '15%' };
      return { name: '100%', price: '0%', stock: '0%' }; // Doar Nume
  };
  const widths = getColWidths();

  const rowStyles = { display: 'flex', alignItems: 'center', width: '100%' };
  const colName = { width: widths.name, paddingRight: 1 };
  const colPrice = { width: widths.price, textAlign: 'right', paddingRight: 1, display: showPrice ? 'block' : 'none' };
  const colStock = { width: widths.stock, textAlign: 'center', display: showStock ? 'block' : 'none',whiteSpace: 'nowrap',minWidth: 'fit-content' };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
        <Box sx={{ position: 'relative' }}>
        
        <TextField 
            fullWidth 
            variant="outlined" 
            label="Caută produs (Nume / Cod)..." 
            autoComplete="off"            
            value={query} 
            onChange={handleQueryChange} 
            onKeyDown={handleKeyDown} 
            // Nu punem autoFocus aici mereu, poate deranja în unele formulare
            placeholder="Tastează numele produsului..."
            sx={{ mb: 1, '& .MuiInputBase-input': { textAlign: { xs: 'left', md: 'left' } } }} 
        />
        
        {/* Overlay Status */}
        <Box sx={{ position: 'absolute', right: 12, top: 28, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'none', zIndex: 5 }}>
            {isNoResults && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Nu s-au găsit produse</Typography>}
            {errorMsg && <Typography variant="caption" color="error" fontWeight="bold">{errorMsg}</Typography>}
            {loading && <CircularProgress size={20} />}
        </Box>

        {/* Dropdown Rezultate */}
        {results.length > 0 && (
            <Paper elevation={6} sx={{ position: 'absolute', zIndex: 1200, width: '100%', maxHeight: '50vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            
            {/* Header Tabel */}
            <Box sx={{ p: 1.5, bgcolor: theme.palette.grey[100], borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={rowStyles}>
                    <Box sx={colName}><Typography variant="caption" fontWeight="bold" color="text.secondary">PRODUS</Typography></Box>
                    {showPrice && <Box sx={colPrice}><Typography variant="caption" fontWeight="bold" color="text.secondary">PREȚ VÂNZARE</Typography></Box>}
                    {showStock && <Box sx={colStock}><Typography variant="caption" fontWeight="bold" color="text.secondary">STOC ACTUAL</Typography></Box>}
                </Box>
            </Box>

            <List sx={{ overflowY: 'auto', p: 0 }}>
                {results.map((product, index) => (
                <React.Fragment key={product.id}>
                    <ListItemButton 
                        onClick={() => handleProductClick(product)} 
                        selected={index === selectedIndex} 
                        sx={{ 
                            py: 1,
                            '&.Mui-selected': { bgcolor: theme.palette.primary.light + '20', borderLeft: `4px solid ${theme.palette.primary.main}` },
                            '&.Mui-selected:hover': { bgcolor: theme.palette.primary.light + '30' }
                        }}
                    >
                    <Box sx={rowStyles}>
                        <Box sx={colName}><Typography variant="body2" fontWeight="500" sx={{ lineHeight: 1.2 }}>{product.name}</Typography></Box>
                        
                        {showPrice && (
                            <Box sx={colPrice}><Typography variant="body2" color="text.secondary">{(product.salePrice || 0).toFixed(2)}</Typography></Box>
                        )}
                        
                        {showStock && (
                            <Box sx={colStock}>
                                <LiveStockDisplay warehouseId={warehouseId} productId={product.id} trackStock={product.trackStock} />
                            </Box>
                        )}
                    </Box>
                    </ListItemButton>
                    <Divider />
                </React.Fragment>
                ))}
            </List>
            </Paper>
        )}
        </Box>
    </ClickAwayListener>
  );
};

ProductSearch.propTypes = {
  onProductSelect: PropTypes.func.isRequired,
  warehouseId: PropTypes.number,
  onlyTrackStock: PropTypes.bool,
  showPrice: PropTypes.bool,
  showStock: PropTypes.bool
};

export default ProductSearch;