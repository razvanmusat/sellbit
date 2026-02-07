import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';

// Importăm Browser-ul Shared
import CategoryBrowser from '../../../../../shared/components/catalog/CategoryBrowser';

const ProductCategory = ({ onProductSelect, warehouseId }) => {

  // Când se dă click pe un produs (pe card sau pe butonul +)
  const handleProductClick = (product) => {
    // Apelăm funcția din părinte (OpenedReceiptCard) care adaugă produsul pe bon
    // Trimitem ID-ul produsului, exact cum face Scanner-ul
    if (product && product.id) {
        onProductSelect(product.id);
    }
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <CategoryBrowser 
        mode="SALES" // Specificăm modul SALES pentru a activa butonul "+"
        warehouseId={warehouseId} // Trimitem gestiunea pt stoc
        onProductClick={handleProductClick}
      />
    </Box>
  );
};

ProductCategory.propTypes = {
  onProductSelect: PropTypes.func.isRequired,
  warehouseId: PropTypes.number // Poate fi null uneori
};

export default ProductCategory;