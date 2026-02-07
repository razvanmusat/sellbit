import React from 'react';
import { Box } from '@mui/material';

// Importăm componenta "mamă" de navigare
import CategoryBrowser from '../../../../shared/components/catalog/CategoryBrowser';

const StockCatalogPage = ({ warehouseId }) => {

  const handleProductClick = (product) => {
    // Momentan nu facem nimic la click în modul Stock
  };

  return (
    <Box sx={{ height: '100%', p: 1 }}>
      <CategoryBrowser 
        mode="STOCK" 
        warehouseId={warehouseId}
        onProductClick={handleProductClick}
      />
    </Box>
  );
};

export default StockCatalogPage;