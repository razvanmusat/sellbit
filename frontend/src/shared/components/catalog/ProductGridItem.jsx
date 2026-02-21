import React, { memo } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useProductGridItem } from '../../hooks/useProductGridItem';

const ProductGridItem = ({ product, onClick, mode, warehouseId, isMenuCategory }) => {
    
    const {
        isAdmin,
        quantity,
        liveStock,
        loadingStock,
        isOutOfStock,
        menuComponents,
        loadingDetails,
        handleTooltipOpen,
        handleIncrement,
        handleDecrement,
        handleAddClick,
        handleEditClick
    } = useProductGridItem(product, mode, warehouseId, isMenuCategory, onClick);

    const MenuTooltipContent = () => (
        <Box sx={{ p: 0.5 }}>
            <Typography variant="subtitle2" sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', mb: 1, pb: 0.5 }}>
                Conținut Meniu:
            </Typography>
            {loadingDetails ? (
                <Box display="flex" alignItems="center" gap={1} py={1}>
                     <Skeleton variant="circular" width={10} height={10} sx={{ bgcolor: 'grey.500' }} />
                     <Typography variant="caption">Se încarcă...</Typography>
                </Box>
            ) : menuComponents.length > 0 ? (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {menuComponents.map((comp, idx) => (
                        <Typography component="li" variant="caption" key={idx} sx={{ listStyleType: 'disc' }}>
                            {parseFloat(comp.quantity)} x {comp.childProductName || comp.childProduct?.name || 'Produs'}
                        </Typography>
                    ))}
                </Box>
            ) : (
                <Typography variant="caption" fontStyle="italic">Nu există ingrediente configurate.</Typography>
            )}
        </Box>
    );

    return (
        <Card 
            elevation={2}
            sx={{ 
                // DIMENSIUNI FIXE
                width: { xs: '150px', sm: '200px' }, 
                height: { xs: '105px', sm: '100px' }, 
                
                display: 'flex', 
                flexDirection: 'column', 
                borderRadius: 2, 
                position: 'relative',
                opacity: (!product.isActive && isAdmin) ? 0.6 : ((isOutOfStock && !isAdmin) ? 0.6 : 1),
                bgcolor: (!product.isActive && isAdmin) ? '#f5f5f5' : 'white',
                transition: 'all 0.2s', 
                cursor: 'default',
                '&:hover': { borderColor: '#1976d2', boxShadow: 3 },
                overflow: 'hidden'
            }}
        >
            {isMenuCategory && (
                <Tooltip 
                    title={<MenuTooltipContent />} 
                    arrow placement="top" onOpen={handleTooltipOpen}
                    slotProps={{
                        tooltip: { sx: { bgcolor: '#263238', minWidth: 150 } },
                        arrow: { sx: { color: '#263238' } }
                    }}
                >
                    <Box sx={{
                        position: 'absolute', top: 5, right: 5, zIndex: 10,
                        bgcolor: 'rgba(255, 255, 255, 0.9)', borderRadius: '50%',
                        boxShadow: 1, width: 22, height: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'help', '&:hover': { bgcolor: '#e3f2fd', color: '#1976d2' }
                    }}>
                        <VisibilityIcon sx={{ fontSize: 15, color: 'text.secondary', opacity: 0.6 }} />
                    </Box>
                </Tooltip>
            )}

            <CardContent sx={{ 
                p: 1.5, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:last-child': { pb: 1.5 } 
            }}>
                
                <Box sx={{ height: '2.8em', overflow: 'hidden' }}>
                    <Typography 
                        variant="body2" 
                        fontWeight="bold" 
                        sx={{ 
                            fontSize: { xs: '0.95rem', sm: '0.95rem' }, 
                            lineHeight: 1.2,
                            display: '-webkit-box', 
                            WebkitBoxOrient: 'vertical', 
                            WebkitLineClamp: 2,
                            textDecoration: (!product.isActive && isAdmin) ? 'line-through' : 'none'
                        }}
                    >
                        {product.name}
                    </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="flex-end">
                    <Box>
                        {/* Pret: Mic pe mobil (0.85rem), Mare pe PC (1.2rem - din codul tau) */}
                        <Typography variant="body1" fontWeight="800" color="primary.main" sx={{ fontSize: { xs: '0.85rem', sm: '1.2rem' }, lineHeight: 1 }}>
                            {product.salePrice ? Number(product.salePrice).toFixed(2) : '0.00'} 
                            <Typography component="span" variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, ml: 0.2, color: 'text.secondary' }}>lei</Typography>
                        </Typography>

                        {!isAdmin && product.trackStock && (
                            <Box sx={{ height: '18px' }}>
                                {loadingStock ? <Skeleton variant="text" width={40} height={12} /> : (
                                    <Typography variant="caption" fontWeight="bold" sx={{ color: isOutOfStock ? 'error.main' : 'success.main' }}>
                                        {liveStock !== null ? `${liveStock} stoc` : ''}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        {isAdmin ? (
                            <IconButton 
                                size="small" 
                                onClick={handleEditClick} 
                                sx={{ 
                                    bgcolor: 'primary.50', 
                                    color: 'primary.main', 
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    width: 30, 
                                    height: 30, 
                                    boxShadow: 1,
                                    '&:hover': { bgcolor: 'primary.100' } 
                                }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        ) : (
                            mode === 'SALES' && (
                                <Box 
                                    display="flex" 
                                    alignItems="center" 
                                    gap={0} 
                                    p={0}
                                    // FARA BGCOLOR
                                >
                                    {/* MINUS */}
                                    <IconButton 
                                        onClick={handleDecrement} 
                                        size="small" 
                                        // MOBIL: p 0.1 | DESKTOP: p 0.5 (din codul tau)
                                        sx={{ p: { xs: 0.1, sm: 0.5 } }} 
                                    >
                                        {/* MOBIL: 0.9rem | DESKTOP: 1.1rem (din codul tau) */}
                                        <RemoveIcon sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }} /> 
                                    </IconButton>
                                    
                                    {/* CANTITATE */}
                                    <Typography 
                                        sx={{ 
                                            fontWeight: 'bold', 
                                            // MOBIL: 12 | DESKTOP: 16 (din codul tau)
                                            minWidth: { xs: 12, sm: 16 }, 
                                            textAlign: 'center', 
                                            // MOBIL: 0.8rem | DESKTOP: 0.9rem (din codul tau)
                                            fontSize: { xs: '0.8rem', sm: '0.9rem' } 
                                        }}
                                    >
                                        {quantity}
                                    </Typography>
                                    
                                    {/* PLUS */}
                                    <IconButton 
                                        onClick={handleIncrement} 
                                        size="small" 
                                        // MOBIL: p 0.1 | DESKTOP: p 0.5 (din codul tau)
                                        sx={{ p: { xs: 0.1, sm: 0.5 } }}
                                    >
                                        {/* MOBIL: 0.9rem | DESKTOP: 1.1rem (din codul tau) */}
                                        <AddIcon sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' } }} />
                                    </IconButton>
                                    
                                    {/* ADD BUTTON */}
                                    <IconButton 
                                        onClick={handleAddClick} 
                                        sx={{ 
                                            bgcolor: 'primary.main', 
                                            color: 'white', 
                                            ml: { xs: 0.1, sm: 0.5 }, // Gap mic mobil, normal desktop
                                            borderRadius: 1, 
                                            // MOBIL: 20px | DESKTOP: 24px (din codul tau)
                                            width: { xs: 20, sm: 24 },
                                            height: { xs: 20, sm: 24 }, 
                                            p: 0, 
                                            '&:hover': { bgcolor: 'primary.dark' } 
                                        }}
                                    >
                                        {/* MOBIL: 1rem | DESKTOP: 1.2rem (din codul tau) */}
                                        <AddIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />
                                    </IconButton>
                                </Box>
                            )
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default memo(ProductGridItem);