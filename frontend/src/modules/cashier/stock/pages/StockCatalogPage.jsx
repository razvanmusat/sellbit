import React from 'react';
import { Box, Typography } from '@mui/material';

const StockCatalogPage = ({ warehouseId }) => {
  return (
    <Box p={3} textAlign="center">
      <Typography variant="h6">Catalog Produse</Typography>
      <Typography variant="body2">Navigare pe categorii pentru gestiunea {warehouseId}</Typography>
    </Box>
  );
};

export default StockCatalogPage;