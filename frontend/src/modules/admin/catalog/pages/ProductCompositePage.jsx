import React from 'react';
import { 
    Box, Skeleton, Alert, Snackbar 
} from '@mui/material';
import Grid from '@mui/material/Grid';

import ProductGridItem from '../../../../shared/components/catalog/ProductGridItem';
import ProductCompositeConfigModal from '../components/ProductCompositeConfigModal';
import { useProductComposite } from '../hooks/useProductComposite';

const ProductCompositePage = () => {
    const {
        loading,
        activeMenus,
        configModalOpen,
        selectedMenu,
        snackbar,
        handleCloseSnackbar,
        handleConfigure,
        handleModalClose,
    } = useProductComposite();

    // --- GRID RENDER ---
    const renderGrid = (menus) => (
        /* Am adăugat Box-ul de la linia 152 din CategoryBrowser pentru a replica exact spațierea */
        <Box sx={{ px: 0 }}>
            <Grid container spacing={1.5}>
                {menus.map(menu => (
                    /* Am adăugat display flex și center pentru a replica exact alinierea din Browser */
                    <Grid key={menu.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <ProductGridItem 
                            product={menu}
                            mode="ADMIN"
                            onClick={handleConfigure}
                            warehouseId={null}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    return (
        <Box 
            sx={{ 
                height: '100%', 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                bgcolor: '#f8f9fa' 
            }}
        >
            <Box 
                sx={{ 
                    flex: 1, 
                    minHeight: 0,
                    overflowY: 'auto', 
                    /* Padding IDENTIC cu linia 119 din CategoryBrowser */
                    p: { xs: 1, sm: 2 }, 
                    '&::-webkit-scrollbar': { display: 'none' },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    transition: 'opacity 0.2s ease-in-out'
                }}
            >
                <Box sx={{ pb: 2 }}>
                    {loading ? (
                        <Box sx={{ px: 0 }}>
                            <Grid container spacing={1.5}>
                                 {[1, 2, 3, 4, 5, 6].map(n => (
                                    <Grid key={n} size={{ xs: 6, sm: 4, md: 3, lg: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <Skeleton 
                                            variant="rectangular" 
                                            width="100%" 
                                            height={105} 
                                            sx={{ borderRadius: 2, maxWidth: { xs: '150px', sm: '200px' } }} 
                                        />
                                    </Grid>
                                 ))}
                            </Grid>
                        </Box>
                    ) : activeMenus.length > 0 ? (
                        renderGrid(activeMenus)
                    ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>Nu există meniuri active configurabile.</Alert>
                    )}
                </Box>
            </Box>

            {configModalOpen && selectedMenu && (
                <ProductCompositeConfigModal 
                    open={configModalOpen} 
                    onClose={handleModalClose} 
                    parentProduct={selectedMenu}
                />
            )}

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

export default ProductCompositePage;