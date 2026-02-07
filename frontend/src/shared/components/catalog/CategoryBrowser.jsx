import React from 'react';
import { Box, Grid, Typography, CircularProgress, Alert, Paper, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';

import { useCategoryBrowser } from '../../hooks/useCategoryBrowser';
import CategoryFolderCard from './CategoryFolderCard';
import ProductGridItem from './ProductGridItem';

const CategoryBrowser = ({ mode = 'SALES', onProductClick, warehouseId, headerActions, refreshTrigger }) => {
  
  const {
    currentCategoryId,
    currentCategoryLabel,
    currentCategory,
    subcategories,
    products,
    loading,
    error,
    navigateToCategory,
    navigateBack,
    isRoot
  } = useCategoryBrowser(mode, refreshTrigger);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
      
      {/* HEADER NAVIGARE */}
      <Paper elevation={0} sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <Box display="flex" alignItems="center">
            <Button
                onClick={navigateBack}
                disabled={isRoot}
                startIcon={isRoot ? <HomeIcon /> : <ArrowBackIcon />}
                sx={{ mr: 2, fontWeight: 'bold', color: isRoot ? 'primary.main' : 'text.primary', opacity: isRoot ? 1 : 0.8 }}
            >
                {isRoot ? 'Acasă' : 'Înapoi'}
            </Button>
            <Typography variant="h6" fontWeight="bold" noWrap>
                {currentCategoryLabel}
            </Typography>
        </Box>

        {/* ZONA ACȚIUNI ADMIN */}
        {headerActions && (
            <Box>
                {headerActions({ 
                    isRoot, 
                    currentCategoryId, 
                    currentCategory,
                    subcategories, 
                    products
                })}
            </Box>
        )}
      </Paper>

      {/* ZONA DE CONȚINUT */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
         
         {loading && (
             <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
         )}

         {!loading && error && (
             <Alert severity="error">{error}</Alert>
         )}

         {!loading && !error && (
             <Box>
                {/* 1. Categorii */}
                {subcategories.length > 0 && (
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {subcategories.map(cat => (
                            /* FIX MUI GRID V2:
                               - Am scos 'item'
                               - Am mutat dimensiunile în prop-ul 'size'
                            */
                            <Grid key={cat.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                                <CategoryFolderCard 
                                    category={cat} 
                                    onClick={navigateToCategory} 
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* 2. Produse */}
                {products.length > 0 && (
                    <Box>
                        {subcategories.length > 0 && (
                             <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase' }}>
                                 Produse
                             </Typography>
                        )}
                        <Grid container spacing={2}>
                            {products.map(prod => (
                                /* FIX MUI GRID V2 AICI DE ASEMENEA
                                */
                                <Grid key={prod.id} size={{ xs: 6, sm: 6, md: 3, lg: 2 }}>
                                    <ProductGridItem 
                                        product={prod} 
                                        mode={mode}
                                        warehouseId={warehouseId} 
                                        onClick={onProductClick} 
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Empty State */}
                {subcategories.length === 0 && products.length === 0 && (
                    <Box textAlign="center" mt={8} color="text.secondary" sx={{ opacity: 0.6 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>Această categorie este goală</Typography>
                        <Typography variant="body1">Folosește butoanele din dreapta-sus pentru a adăuga conținut.</Typography>
                    </Box>
                )}
             </Box>
         )}
      </Box>
    </Box>
  );
};

export default CategoryBrowser;