import React from 'react';
import { Box } from '@mui/material';

import CategoryBrowser from '../../../../shared/components/catalog/CategoryBrowser';

const StockCatalogPage = ({ warehouseId }) => {

  const handleProductClick = (product) => {
    // Momentan nu facem nimic la click în modul Stock
  };

  return (
    <Box 
        sx={{ 
            height: '100%', 
            // MODIFICARE: Eliminat p: 1, adăugat stiluri admin-like
            px: 0, 
            overflowY: 'auto',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
            '-ms-overflow-style': 'none',
            'scrollbar-width': 'none',
        }}
    >
      <CategoryBrowser 
        mode="STOCK" 
        warehouseId={warehouseId}
        onProductClick={handleProductClick}
      />
    </Box>
  );
};

export default StockCatalogPage;