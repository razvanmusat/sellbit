import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const ProductCard = ({ item, onQuantityChange, onRemove }) => {
  const { productId, name = 'Produs invalid', quantity = 0, lineTotal = 0 } = item;

  const handleIncrement = () => {
    onQuantityChange(productId, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(productId, quantity - 1);
    } else {
      onRemove();
    }
  };

  return (
    <Box
      className="product-card"
      sx={{
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: { xs: 1.5, sm: 2 },
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.palette.background.paper,
        width: '100%',
      }}
    >
      {/* 1. NUME PRODUS - Flexibil (Ocupă restul spațiului) */}
      <Box sx={{ 
        flex: 1, 
        mr: 1,
        minWidth: 0 
      }}>
        <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: '500',
              lineHeight: 1,
              wordBreak: 'break-word',
              whiteSpace: 'normal'
            }}
        >
          {name}
        </Typography>
      </Box>

      {/* 2. BUTOANE CONTROL CANTITATE */}
      <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0, sm: 1 }, 
          flexShrink: 0, 
          mr: 1,        
          width: { xs: 'auto', md: '120px' }, 
          justifyContent: { xs: 'flex-start', md: 'center' } 
      }}>
        <IconButton 
            onClick={handleDecrement} 
            color={quantity === 1 ? "error" : "primary"} 
            sx={{ p: 0.5 }}
        >
          {quantity === 1 ? <DeleteOutlineIcon /> : <RemoveCircleOutlineIcon />}
        </IconButton>

        <Typography 
            variant="body1" 
            sx={{ 
                minWidth: '24px', 
                textAlign: 'center', 
                fontWeight: 'bold' 
            }}
        >
          {quantity}
        </Typography>

        <IconButton onClick={handleIncrement} color="primary" sx={{ p: 0.5 }}>
          <AddCircleOutlineIcon />
        </IconButton>
      </Box>

      {/* 3. PREȚ TOTAL LINIE */}
      <Typography
        variant="h6"
        sx={{
          flexShrink: 0,
          textAlign: 'right',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          fontSize: { xs: '1rem', sm: '1.25rem' },          
          width: { xs: 'auto', md: '130px' },
        }}
      >
        {(lineTotal || 0).toFixed(2)}
      </Typography>
    </Box>
  );
};

ProductCard.propTypes = {
  item: PropTypes.object.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default ProductCard;