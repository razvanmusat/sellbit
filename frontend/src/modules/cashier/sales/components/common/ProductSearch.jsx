import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  TextField, List, ListItemButton, CircularProgress, Box, Paper, Typography, Divider, useTheme, ClickAwayListener
} from '@mui/material';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'; 
import { SearchProductService } from '../../api/SearchProductService';
import { StockCurrentService } from '../../api/StockCurrentService';

// --- SUB-COMPONENTĂ: STOC LIVE ---
const LiveStockDisplay = ({ warehouseId, productId, trackStock }) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trackStock === false) {
        setLoading(false);
        return;
    }
    if (!warehouseId) {
        setLoading(false); 
        return;
    }

    let mounted = true;
    
    const fetchStock = async () => {
      try {
        const qty = await StockCurrentService.getProductStockLive(warehouseId, productId);
        if (mounted) {
            const numericQty = Number(qty);
            setStock(!isNaN(numericQty) && numericQty !== null ? numericQty : 0);
        }
      } catch (error) {
        if (mounted) setStock(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStock();
    return () => { mounted = false; };
  }, [warehouseId, productId, trackStock]);

  if (trackStock === false) {
      return (
        <Typography variant="caption" color="text.secondary" title="Nelimitat">
            <AllInclusiveIcon fontSize="small" sx={{ verticalAlign: 'middle', fontSize: '1rem' }} />
        </Typography>
      );
  }

  if (loading) return <CircularProgress size={10} thickness={5} />;
  
  const displayVal = stock ?? 0;
  const isOutOfStock = displayVal <= 0.0001; 

  return (
    <Typography 
      variant="caption" 
      fontWeight="bold" 
      sx={{ 
        color: isOutOfStock ? 'error.main' : 'success.main',
        fontSize: { xs: '0.75rem', sm: '0.85rem' }
      }}
    >
      {Number(displayVal).toLocaleString('ro-RO', { maximumFractionDigits: 2 })}
    </Typography>
  );
};

LiveStockDisplay.propTypes = {
    warehouseId: PropTypes.number,
    productId: PropTypes.number.isRequired,
    trackStock: PropTypes.bool
};

// --- COMPONENTA PRINCIPALĂ ---
const ProductSearch = ({ onProductSelect, warehouseId, onlyTrackStock = false }) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [selectedIndex, setSelectedIndex] = useState(-1); 
  const debounceTimeout = useRef(null);

  const isNoResults = hasSearched && !loading && results.length === 0 && query.length >= 2;

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const searchProducts = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await SearchProductService.searchProductsByName(searchQuery);
      const finalData = onlyTrackStock ? data.filter(p => p.trackStock === true) : data;      
      setResults(finalData);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      searchProducts(newQuery);
    }, 300);
  };

  // Funcția care se execută când dai click în afara zonei de căutare
  const handleClickAway = () => {
    // Dacă avem rezultate deschise sau text scris, le resetăm (comportament de Escape)
    if (results.length > 0 || query.length > 0) {
        setResults([]);
        setQuery('');
        setHasSearched(false);
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
        setResults([]);
        setQuery('');
    }
  };

  const handleProductClick = (product) => {
    onProductSelect(product.id); 
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSelectedIndex(-1);
  };

  const rowStyles = {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
  };

  const colName = { width: '70%', paddingRight: 1 };
  const colPrice = { width: '20%', textAlign: 'right', paddingRight: 1 };
  const colStock = { width: '10%', textAlign: 'center' };

  return (
    // ClickAwayListener detectează click-urile în exterior
    <ClickAwayListener onClickAway={handleClickAway}>
        <Box sx={{ position: 'relative' }}>
        
        <TextField 
            fullWidth 
            variant="outlined" 
            label="Caută produs (Nume)..." 
            autoComplete="off"            
            value={query} 
            onChange={handleQueryChange} 
            onKeyDown={handleKeyDown} 
            autoFocus 
            placeholder="Minim 2 caractere"
            // Aliniere stânga pe mobil, center pe desktop
            sx={{ 
                mb: 1,
                '& .MuiInputBase-input': {
                    textAlign: { xs: 'left', md: 'center' } 
                }
            }} 
        />
        
        {/* Overlay Absolut pentru Loading și Mesaj */}
        <Box 
            sx={{ 
                position: 'absolute', 
                right: 12, 
                top: 28, 
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pointerEvents: 'none', 
                zIndex: 5
            }}
        >
            {isNoResults && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                    Nu s-au găsit produse
                </Typography>
            )}

            {loading && <CircularProgress size={20} />}
        </Box>

        {/* DROPDOWN REZULTATE */}
        {results.length > 0 && (
            <Paper 
            elevation={6} 
            sx={{ 
                position: 'absolute', 
                zIndex: 1200, 
                width: '100%', 
                maxHeight: '50vh', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2
            }}
            >
            <Box sx={{ p: 1.5, bgcolor: theme.palette.grey[100], borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={rowStyles}>
                    <Box sx={colName}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">PRODUS</Typography>
                    </Box>
                    <Box sx={colPrice}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">PREȚ</Typography>
                    </Box>
                    <Box sx={colStock}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">STOC</Typography>
                    </Box>
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
                            '&.Mui-selected': {
                                bgcolor: theme.palette.primary.light + '20', 
                                borderLeft: `4px solid ${theme.palette.primary.main}`
                            },
                            '&.Mui-selected:hover': {
                                bgcolor: theme.palette.primary.light + '30',
                            }
                        }}
                    >
                    <Box sx={rowStyles}>
                        <Box sx={colName}>
                            <Typography variant="body2" fontWeight="500" sx={{ lineHeight: 1.2 }}>
                                {product.name}
                            </Typography>
                        </Box>
                        <Box sx={colPrice}>
                            <Typography variant="body2" color="primary" fontWeight="bold">
                                {(product.salePrice || 0).toFixed(2)}
                            </Typography>
                        </Box>
                        <Box sx={colStock}>
                            <LiveStockDisplay 
                                warehouseId={warehouseId} 
                                productId={product.id} 
                                trackStock={product.trackStock}
                            />
                        </Box>
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
  warehouseId: PropTypes.number
};

export default ProductSearch;