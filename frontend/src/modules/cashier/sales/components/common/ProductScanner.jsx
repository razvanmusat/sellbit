import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, TextField, InputAdornment, CircularProgress } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { SearchProductService } from '../../api/SearchProductService';

import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';

const ProductScanner = ({ onProductSelect }) => {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  // 👇 Folosim un string pentru eroare, nu doar un boolean, ca să afișăm mesajul din dicționar
  const [errorMsg, setErrorMsg] = useState('');

  const inputRef = useRef(null);

  // 1. Auto-Focus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 2. Resetare text la tastare
  const handleChange = (e) => {
    setBarcode(e.target.value);
    if (errorMsg) setErrorMsg(''); // Resetăm eroarea când utilizatorul scrie
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
    setErrorMsg('');

    try {
      const product = await SearchProductService.getProductByBarcode(code);
      
      if (product) {
        onProductSelect(product.id || product); 
        setBarcode(''); 
      } else {
        // Dacă nu găsește produsul (dar serverul răspunde 200 OK cu null/empty)
        setErrorMsg("Produsul nu a fost găsit.");
        setBarcode(''); 
      }
    } catch (err) {
      console.error(err);
      setBarcode('');
      // 👇 LEGĂM EROAREA LA DICȚIONAR
      setErrorMsg(getFriendlyErrorMessage(err));
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
        
        // Dacă avem eroare, placeholder-ul e standard, dar arătăm eroarea jos
        placeholder="Scanează cod de bare..."
        label="Scanează cod de bare"
        
        value={barcode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
        autoComplete="off"
        disabled={loading}
        
        // Dacă avem mesaj de eroare, colorăm inputul în roșu
        error={!!errorMsg}
        // Afișăm mesajul tradus sub input
        helperText={errorMsg}

        sx={{
            '& .MuiInputBase-input': {
                textAlign: { xs: 'left', md: 'center' }
            }
        }}

        // 👇 FIX: 'InputProps' -> 'slotProps.input'
        slotProps={{
            input: {
                startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerIcon color={errorMsg ? "error" : "primary"} />
                    </InputAdornment>
                ),
                endAdornment: loading ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                ) : null
            }
        }}
      />
    </Box>
  );
};

ProductScanner.propTypes = {
  onProductSelect: PropTypes.func.isRequired,
};

export default ProductScanner;