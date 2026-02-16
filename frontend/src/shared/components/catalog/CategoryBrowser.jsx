import React from 'react';
import { Box, Typography, Alert, Paper, Button } from '@mui/material';
import Grid from '@mui/material/Grid'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';

import { useCategoryBrowser } from '../../hooks/useCategoryBrowser';
import CategoryFolderCard from './CategoryFolderCard';
import ProductGridItem from './ProductGridItem';

const CategoryBrowser = ({ 
    mode = 'SALES', 
    onProductClick, 
    warehouseId, 
    headerActions, 
    refreshTrigger,
    categories, 
    products, 
    selectedCategoryId, 
    onCategorySelect,
    currentCategoryData,
    onToggleStatus,
    onEditCategory,
    customTitle,
    topContent
}) => {
  
  const isControlled = Array.isArray(categories);
  const hookData = useCategoryBrowser(mode, refreshTrigger, isControlled);

  const displaySubcategories = isControlled ? categories : hookData.subcategories;
  const displayProducts      = isControlled ? products : hookData.products;
  const isLoading            = isControlled ? false : hookData.loading;
  const displayError         = isControlled ? null : hookData.error;
  const isRoot               = isControlled ? !selectedCategoryId : hookData.isRoot;

  const currentCategory = isControlled ? currentCategoryData : hookData.currentCategory;

  let label = hookData.currentCategoryLabel;
  if (isControlled) {
      if (customTitle) label = customTitle;
      else if (currentCategory && currentCategory.label) label = currentCategory.label;
      else label = selectedCategoryId ? 'Încărcare...' : 'Catalog Admin';
  }

  const handleNavigate = (cat) => {
      if (isControlled && onCategorySelect) onCategorySelect(cat.id);
      else hookData.navigateToCategory(cat);
  };

  const handleBack = () => {
      if (isControlled && onCategorySelect) {
           if (currentCategory && currentCategory.parentId) {
               onCategorySelect(currentCategory.parentId);
           } else {
               onCategorySelect(null);
           }
      }
      else {
          hookData.navigateBack();
      }
  };

  const isMenuCategory = currentCategory?.code === 'MENU';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', overflow: 'hidden' }}>
      
      <Paper elevation={0} sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
        <Box display="flex" alignItems="center">
            <Button
                onClick={handleBack}
                disabled={isRoot}
                startIcon={isRoot ? <HomeIcon /> : <ArrowBackIcon />}
                sx={{ mr: 2, fontWeight: 'bold', color: isRoot ? 'primary.main' : 'text.primary', opacity: isRoot ? 1 : 0.8 }}
            >
                {isRoot ? 'Acasă' : 'Înapoi'}
            </Button>
            
            <Typography variant="h6" fontWeight="bold" noWrap sx={{ color: 'text.primary' }}>
                {label}
            </Typography>
        </Box>

        {headerActions && (
            <Box>
                {headerActions({ 
                    isRoot, 
                    currentCategoryId: isControlled ? selectedCategoryId : hookData.currentCategoryId, 
                    currentCategory, 
                    subcategories: displaySubcategories, 
                    products: displayProducts 
                })}
            </Box>
        )}
      </Paper>

      {topContent && (
          <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', px: 2, flexShrink: 0 }}>
              {topContent}
          </Box>
      )}

      <Box 
        sx={{ 
            flex: 1, 
            minHeight: 0,
            overflowY: 'auto', 
            p: { xs: 1, sm: 2 }, // Am revenit la un padding minim (1) pe mobil pentru a nu lipi grid-ul de margini
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            opacity: isLoading ? 0.6 : 1,
            pointerEvents: isLoading ? 'none' : 'auto',
            transition: 'opacity 0.2s ease-in-out'
        }}
      >
         {!isLoading && displayError && <Alert severity="error">{displayError}</Alert>}

         {!displayError && (
             <Box sx={{ pb: 2 }}>
                
                {/* --- SECTIUNE CATEGORII --- */}
                {displaySubcategories && displaySubcategories.length > 0 && (
                    <Box sx={{ mb: { xs: 1, sm: 4 }, px: 0 }}>
                        <Grid container spacing={1.5} sx={{ justifyContent: 'flex-start' }}>
                            {displaySubcategories.map(cat => (
                                <Grid key={cat.id} size={{ xs: 4, sm: 3, md: 2, lg: 1.5 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <CategoryFolderCard 
                                        category={cat} 
                                        onClick={() => handleNavigate(cat)} 
                                        onToggleStatus={onToggleStatus}
                                        onEdit={onEditCategory} 
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* --- SECTIUNE PRODUSE --- */}
                {displayProducts && displayProducts.length > 0 && (
                    <Box sx={{ px: 0 }}>
                        {displaySubcategories && displaySubcategories.length > 0 && (
                             <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', ml: 1 }}>
                                 Produse
                             </Typography>
                        )}
                        <Grid container spacing={2}>
                            {displayProducts.map(prod => (
                                <Grid key={prod.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <ProductGridItem 
                                        product={prod} 
                                        mode={mode}
                                        warehouseId={warehouseId} 
                                        onClick={onProductClick}
                                        isMenuCategory={isMenuCategory}
                                        onToggleStatus={onToggleStatus}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {!isLoading && (!displaySubcategories || displaySubcategories.length === 0) && (!displayProducts || displayProducts.length === 0) && (
                    <Box textAlign="center" mt={8} color="text.secondary" sx={{ opacity: 0.6 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>Categorie goală</Typography>
                        <Typography variant="body1">Nu există elemente de afișat în acest tab.</Typography>
                    </Box>
                )}
             </Box>
         )}
      </Box>
    </Box>
  );
};

export default CategoryBrowser;