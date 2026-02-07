import React, { useState } from 'react';
import { Box, Button, Skeleton, Snackbar, Alert } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import EditIcon from '@mui/icons-material/Edit';

// Importurile rămân EXACT cum le ai tu în codul funcțional
import CategoryBrowser from '../../../../shared/components/catalog/CategoryBrowser';
import CategoryModal from '../components/CategoryModal';
import ProductModal from '../components/ProductModal';

const ProductCatalogPage = () => {
    // --- STATE SI LOGICA EXACTA DIN CODUL TAU ---
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [currentParentId, setCurrentParentId] = useState(null);

    const [prodModalOpen, setProdModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [viewingCategoryId, setViewingCategoryId] = useState(null);

    const [refreshCounter, setRefreshCounter] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const blurAndOpen = (actionFn) => (e) => {
        if (e && e.currentTarget) e.currentTarget.blur();
        actionFn();
    };

    const openCreateCategory = (parentId) => {
        setCategoryToEdit(null);
        setCurrentParentId(parentId);
        setCatModalOpen(true);
    };

    const openEditCategory = (category) => {
        setCategoryToEdit(category);
        setCatModalOpen(true);
    };

    const openCreateProduct = (categoryId) => {
        setProductToEdit(null);
        setViewingCategoryId(categoryId);
        setProdModalOpen(true);
    };

    const openEditProduct = (product) => {
        setProductToEdit(product);
        setProdModalOpen(true);
    };

    const handleSuccess = (msg) => {
        setRefreshCounter(prev => prev + 1);
        setSnackbar({ open: true, message: msg || 'Succes!', severity: 'success' });
    };

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const renderHeaderActions = ({ isRoot, currentCategoryId, currentCategory, subcategories, products, loading }) => {
        if (loading) return <Skeleton variant="rectangular" width={200} height={36} sx={{ borderRadius: 1 }} />;

        const hasSubcats = subcategories && subcategories.length > 0;
        const hasProducts = products && products.length > 0;
        const isEmpty = !hasSubcats && !hasProducts;

        if (isRoot) {
            return (
                <Button 
                    variant="contained" color="secondary" startIcon={<CreateNewFolderIcon />}
                    onClick={blurAndOpen(() => openCreateCategory(null))}
                >
                    Categorie Nouă
                </Button>
            );
        }

        return (
            <Box display="flex" gap={2}>
                <Button 
                    variant="outlined" color="warning" startIcon={<EditIcon />}
                    onClick={blurAndOpen(() => openEditCategory(currentCategory))}
                >
                    Editează Categoria
                </Button>

                {!hasProducts && (
                    <Button 
                        variant="contained" color="secondary" startIcon={<CreateNewFolderIcon />}
                        onClick={blurAndOpen(() => openCreateCategory(currentCategoryId))}
                    >
                        Adaugă Subcategorie
                    </Button>
                )}

                {(isEmpty || hasProducts) && (
                    <Button 
                        variant="contained" color="primary" startIcon={<AddCircleIcon />}
                        onClick={blurAndOpen(() => openCreateProduct(currentCategoryId))}
                    >
                        Adaugă Produs
                    </Button>
                )}
            </Box>
        );
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CategoryBrowser 
                mode="ADMIN" 
                refreshTrigger={refreshCounter}
                headerActions={renderHeaderActions}
                onEditCategory={openEditCategory}
                onProductClick={openEditProduct} 
            />

            <CategoryModal 
                open={catModalOpen}
                onClose={() => setCatModalOpen(false)}
                categoryToEdit={categoryToEdit}
                parentId={currentParentId}
                onSuccess={handleSuccess} 
            />

            <ProductModal 
                open={prodModalOpen}
                onClose={() => setProdModalOpen(false)}
                productToEdit={productToEdit}
                categoryId={viewingCategoryId}
                onSuccess={handleSuccess}
            />

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProductCatalogPage;