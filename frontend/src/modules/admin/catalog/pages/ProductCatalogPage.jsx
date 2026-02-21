import React from 'react';
import { Box, Button, Snackbar, Alert, Tabs, Tab, useMediaQuery, useTheme } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';

import CategoryBrowser from '../../../../shared/components/catalog/CategoryBrowser';
import CategoryModal from '../components/CategoryModal';
import ProductModal from '../components/ProductModal';
import { useProductCatalog } from '../hooks/useProductCatalog';

const ProductCatalogPage = () => {
    const { state, actions } = useProductCatalog();
    const categoryToEditObj = state.currentCategoryDetails;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm')); 

    const renderHeaderActions = ({ isRoot }) => {
        const isInactiveTab = state.tabIndex === 1;

        const btnSx = {
            minWidth: { xs: 'auto', sm: '64px' }, 
            px: { xs: 1, sm: 2 }, 
            fontSize: { xs: '0.75rem', sm: '0.875rem' } 
        };

        if (isRoot) {
            if (isInactiveTab) return null;
            return (
                <Button 
                    variant="contained" color="secondary" startIcon={<CreateNewFolderIcon />}
                    onClick={actions.blurAndOpen(() => actions.openCreateCategory(null))}
                    sx={btnSx}
                >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Categorie Nouă</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Categorie</Box>
                </Button>
            );
        }

        const canAddSubcategory = !state.hasAnyProducts;
        const canAddProduct = !state.hasAnySubcategories;

        return (
            <Box display="flex" gap={{ xs: 1, sm: 2 }}>
                {!isInactiveTab && (
                    <>
                        {canAddSubcategory && (
                            <Button 
                                variant="contained" color="secondary" startIcon={<CreateNewFolderIcon />}
                                onClick={actions.blurAndOpen(() => actions.openCreateCategory(state.currentCategoryId))}
                                sx={btnSx}
                            >
                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Adaugă Subcategorie</Box>
                                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Subcat.</Box>
                            </Button>
                        )}

                        {canAddProduct && (
                            <Button 
                                variant="contained" color="primary" startIcon={<AddCircleIcon />}
                                onClick={actions.blurAndOpen(() => actions.openCreateProduct(state.currentCategoryDetails?.id ?? state.currentCategoryId))}
                                sx={btnSx}
                            >
                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Adaugă Produs</Box>
                                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Produs</Box>
                            </Button>
                        )}
                    </>
                )}
            </Box>
        );
    };

    const renderTabs = () => (
        <Box borderBottom={1} borderColor="divider" mb={0}>
            <Tabs 
                value={state.tabIndex} 
                onChange={(e, v) => actions.setTabIndex(v)} 
                indicatorColor="primary" 
                textColor="primary"
                variant={isMobile ? "fullWidth" : "standard"}
            >
                <Tab label={`Active (${state.countActive})`} />
                <Tab label={`Inactive (${state.countInactive})`} />
            </Tabs>
        </Box>
    );

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <Box sx={{ flexShrink: 0 }}>
                {renderTabs()}
            </Box>
            
            <Box 
                sx={{
                    flex: 1,
                    // Mentinem scroll-ul cum l-ai definit tu, dar fara padding bottom
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    px: 0, 
                    pb: 0 // FIX: Scoaterea lui 10 rezolva spatiul gol de jos
                }}
            >
                <CategoryBrowser 
                    mode="ADMIN" 
                    categories={state.filteredCategories}
                    products={state.filteredProducts}
                    refreshTrigger={state.refreshCounter}
                    selectedCategoryId={state.currentCategoryId}
                    headerActions={renderHeaderActions}
                    onEditCategory={actions.openEditCategory} 
                    onProductClick={actions.openEditProduct} 
                    onCategorySelect={actions.handleCategorySelect}
                    currentCategoryData={categoryToEditObj}
                    onToggleStatus={actions.handleToggleItem}
                />
            </Box>

            <CategoryModal 
                open={state.catModalOpen}
                onClose={() => actions.setCatModalOpen(false)}
                categoryToEdit={state.categoryToEdit}
                parentId={state.currentParentId}
                onSuccess={actions.handleSuccess} 
            />

            <ProductModal 
                open={state.prodModalOpen}
                onClose={() => actions.setProdModalOpen(false)}
                productToEdit={state.productToEdit}
                categoryId={state.viewingCategoryId}
                onSuccess={actions.handleSuccess}
            />

            <Snackbar 
                open={state.snackbar.open} 
                autoHideDuration={4000} 
                onClose={actions.handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={actions.handleCloseSnackbar} severity={state.snackbar.severity} sx={{ width: '100%' }}>
                    {state.snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProductCatalogPage;