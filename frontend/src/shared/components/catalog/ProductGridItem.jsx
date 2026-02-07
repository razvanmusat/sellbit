import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, IconButton, Tooltip } from '@mui/material';
// Iconițe
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import { StockCurrentService } from '../../../modules/cashier/sales/api/StockCurrentService';

const ProductGridItem = ({ product, onClick, mode, warehouseId }) => {
  const [liveStock, setLiveStock] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const isAdmin = mode === 'ADMIN';

  // --- FETCH STOC (DOAR PENTRU SALES) ---
  useEffect(() => {
    let isMounted = true;
    // Dacă e admin, NU ne interesează stocul aici
    if (!isAdmin && product.trackStock && warehouseId) {
        setLoadingStock(true);
        StockCurrentService.getProductStockLive(warehouseId, product.id)
            .then(qty => { if (isMounted) setLiveStock(qty); })
            .catch(() => { if (isMounted) setLiveStock(null); })
            .finally(() => { if (isMounted) setLoadingStock(false); });
    }
    return () => { isMounted = false; };
  }, [product.id, product.trackStock, warehouseId, isAdmin]);

  const isOutOfStock = !isAdmin && product.trackStock && liveStock !== null && liveStock <= 0;

  // --- HANDLERS SALES ---
  const handleIncrement = () => {
    if (product.trackStock && liveStock !== null && quantity >= liveStock) return; 
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleAddClick = () => {
    if (!isOutOfStock) {
        onClick(product, quantity); // Trimitem produs + cantitate
        if (product.trackStock && liveStock !== null) {
            setLiveStock(prev => prev - quantity);
        }
        setQuantity(1);
    }
  };

  // --- HANDLER ADMIN ---
  const handleEditClick = () => {
      // Trimitem doar obiectul produs pentru editare
      onClick(product);
  };

  return (
    <Card 
        elevation={2}
        sx={{ 
            height: '100%', 
            display: 'flex', flexDirection: 'column', 
            borderRadius: 2, 
            border: '1px solid transparent',
            // În Admin le arătăm clar pe cele inactive
            opacity: (!product.isActive && isAdmin) ? 0.6 : ((isOutOfStock && !isAdmin) ? 0.6 : 1),
            bgcolor: (!product.isActive && isAdmin) ? '#f5f5f5' : 'white',
            transition: 'all 0.2s',
            cursor: 'default',
            overflow: 'hidden',
            '&:hover': { 
                borderColor: '#1976d2', 
                boxShadow: 3 
            }
        }}
    >
      <CardContent sx={{ p: 1, pb: '8px !important', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* 1. NUME PRODUS */}
        <Typography 
            variant="body2" 
            fontWeight="bold" 
            mb={0.5} 
            sx={{ 
                fontSize: '0.85rem', 
                lineHeight: 1.2, 
                height: '2.4em', 
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                // Dacă e inactiv în admin, îl tăiem vizual
                textDecoration: (!product.isActive && isAdmin) ? 'line-through' : 'none'
            }}
        >
          {product.name}
        </Typography>

        <Box flex={1} />

        {/* 2. ZONA DE JOS */}
        <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'flex-end' }} 
        >
            
            {/* A. PREȚ (și STOC doar dacă SALES) */}
            <Box sx={{ mb: { xs: 1, sm: 0 } }}>
                <Typography variant="body1" fontWeight="800" color="primary.main" sx={{ fontSize: '1rem', lineHeight: 1 }}>
                    {product.salePrice ? Number(product.salePrice).toFixed(2) : '0.00'} 
                    <Typography component="span" variant="caption" sx={{ fontSize: '0.7rem', ml: 0.2, color: 'text.secondary' }}>lei</Typography>
                </Typography>

                {/* Stocul apare DOAR în SALES */}
                {!isAdmin && product.trackStock && (
                    <Box mt={0.2}>
                        {loadingStock ? (
                            <Skeleton variant="text" width={40} height={15} />
                        ) : (
                            <Typography 
                                variant="caption" 
                                fontWeight="bold" 
                                sx={{ 
                                    color: isOutOfStock ? 'error.main' : 'success.main', 
                                    fontSize: '0.75rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {liveStock !== null ? `${liveStock} stoc` : 'Indisp.'}
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>

            {/* B. CONTROALE (ADMIN vs SALES) */}
            
            {/* --- CAZ 1: ADMIN (Buton Editare) --- */}
            {isAdmin && (
                <Box alignSelf="flex-end">
                     <Tooltip title="Editează produs">
                        <IconButton 
                            size="small" 
                            onClick={handleEditClick}
                            sx={{ 
                                bgcolor: 'primary.50', 
                                color: 'primary.main',
                                border: '1px solid',
                                borderColor: 'primary.main',
                                '&:hover': { bgcolor: 'primary.100' }
                            }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                     </Tooltip>
                </Box>
            )}

            {/* --- CAZ 2: SALES (Butoane Cantitate) --- */}
            {!isAdmin && (
                <Box 
                    display="flex" 
                    alignItems="center"
                    width={{ xs: '100%', sm: 'auto' }} 
                    justifyContent={{ xs: 'space-between', sm: 'flex-end' }} 
                >
                    <Box display="flex" alignItems="center" mr={1.5}> 
                        <IconButton 
                            onClick={handleDecrement} 
                            sx={{ p: 0, width: 24, height: 24, color: 'text.secondary', border: '1px solid #eee', borderRadius: 1 }}
                        > 
                            <RemoveIcon sx={{ fontSize: 16 }} /> 
                        </IconButton>
                        
                        <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 24, textAlign: 'center', fontSize: '0.9rem' }}>
                            {quantity}
                        </Typography>
                        
                        <IconButton 
                            onClick={handleIncrement} 
                            disabled={isOutOfStock} 
                            sx={{ p: 0, width: 24, height: 24, color: 'primary.main', border: '1px solid #eee', borderRadius: 1 }}
                        > 
                            <AddIcon sx={{ fontSize: 16 }} /> 
                        </IconButton>
                    </Box>

                    <IconButton 
                        onClick={handleAddClick} 
                        disabled={isOutOfStock}
                        sx={{ 
                            bgcolor: isOutOfStock ? 'action.disabledBackground' : 'primary.main',
                            color: 'white',
                            width: 30, height: 30, 
                            borderRadius: 1, 
                            flexShrink: 0,
                            '&:hover': { bgcolor: isOutOfStock ? 'action.disabledBackground' : 'primary.dark' },
                            boxShadow: 1,
                            p: 0
                        }}
                    >
                        <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Box>
            )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductGridItem;