import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, TextField, InputAdornment, CircularProgress } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { SearchProductService } from '../../api/SearchProductService';

const ProductScanner = ({ onProductSelect }) => {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const inputRef = useRef(null);

  // 1. Auto-Focus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 2. Resetare text la tastare
  const handleChange = (e) => {
    setBarcode(e.target.value);
    if (notFound) setNotFound(false);
  };

  // 3. Handler Enter
  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!barcode.trim()) return;
      await processBarcode(barcode.trim());
    }
  };

  // 4. Procesare Scanare
  const processBarcode = async (code) => {
    setLoading(true);
    setNotFound(false);

    try {
      const product = await SearchProductService.getProductByBarcode(code);
      
      if (product) {
        onProductSelect(product.id || product); 
        setBarcode(''); 
      } else {
        setNotFound(true);
        setBarcode(''); 
      }
    } catch (err) {
      console.error(err);
      setNotFound(true);
      setBarcode('');
    } finally {
      setLoading(false);
      setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 1 }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        variant="outlined"
        
        // FĂRĂ ROȘU: Doar schimbăm textul placeholder-ului
        placeholder={notFound ? "Produsul nu a fost găsit. Scanează din nou..." : "Scanează cod de bare..."}
        label="Scanează cod de bare"
        
        value={barcode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
        autoComplete="off"
        disabled={loading}
        
        // POZIȚIONARE TEXT (Cursor):
        // Pe Desktop (md) -> Center (Mijloc)
        // Pe Mobil (xs) -> Left (Stânga) - ca să încapă textul "Produsul nu a fost găsit"
        sx={{
            '& .MuiInputBase-input': {
                textAlign: { xs: 'left', md: 'center' }
            }
        }}

        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <QrCodeScannerIcon color="primary" />
            </InputAdornment>
          ),
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : null
        }}
      />
    </Box>
  );
};

ProductScanner.propTypes = {
  onProductSelect: PropTypes.func.isRequired,
};

export default ProductScanner;