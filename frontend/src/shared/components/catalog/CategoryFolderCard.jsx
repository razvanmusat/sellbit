import React, { memo } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

import RestaurantIcon from '@mui/icons-material/Restaurant';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EventIcon from '@mui/icons-material/Event';
import FolderIcon from '@mui/icons-material/Folder';

const CATEGORY_ICONS = {
    'REGULAR': RestaurantIcon,
    'SERVICE': RoomServiceIcon,
    'CATERING': DinnerDiningIcon,
    'MENU': MenuBookIcon,
    'ADVANCE': EventIcon
};

const CategoryFolderCard = ({ category, onClick, onEdit }) => {
  const isActive = category.isActive !== undefined ? category.isActive : category.active !== false;
  const IconComponent = CATEGORY_ICONS[category.code] || FolderIcon;

  return (
    <Paper 
        elevation={2}
        onClick={() => onClick(category)}
        sx={{ 
            // --- DIMENSIUNI FIXE ---
            // Mobil (xs): 100px (Perfect pentru 3 pe rând pe ecrane de 360px+)
            // Desktop (sm): 130px
            width: { xs: '100px', sm: '130px' }, 
            height: { xs: '100px', sm: '130px' },
            
            // Blocăm orice redimensionare
            minWidth: { xs: '100px', sm: '130px' },
            maxWidth: { xs: '100px', sm: '130px' },
            minHeight: { xs: '100px', sm: '130px' },
            maxHeight: { xs: '100px', sm: '130px' },

            position: 'relative',
            cursor: 'pointer', 
            borderRadius: 3, 
            bgcolor: isActive ? '#ffffff' : '#f5f5f5',
            border: isActive ? 'none' : '1px dashed #bdbdbd',
            transition: 'transform 0.1s',
            
            // Tăiem orice iese din card
            overflow: 'hidden',
            
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between', 
            
            p: 1, 
            mx: 'auto', // Centrare în grid

            '&:active': { transform: 'scale(0.96)' },
            '&:hover': { 
                bgcolor: isActive ? '#fafafa' : '#eeeeee',
                boxShadow: 3,
                '& .edit-btn': { opacity: 1, transform: 'scale(1)' }
            }
        }}
    >
        {onEdit && (
            <Tooltip title="Editează">
                <IconButton
                    className="edit-btn"
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation(); 
                        onEdit(category);
                    }}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        zIndex: 10,
                        padding: { xs: '2px', md: '8px' },
                        color: 'primary.main',
                        opacity: { xs: 0.8, md: 0 }, 
                        transform: { xs: 'scale(0.7)', md: 'scale(0.8)' },
                        '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.1)', transform: 'scale(1.1)' }
                    }}
                >
                    <EditIcon sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }} />
                </IconButton>
            </Tooltip>
        )}

        {/* ICONIȚA */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', pt: 0.5 }}>
            <Box sx={{ 
                width: { xs: '36px', sm: '50px' }, 
                height: { xs: '36px', sm: '50px' }, 
                bgcolor: isActive ? '#fff3e0' : '#e0e0e0', 
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isActive ? '#f57c00' : '#9e9e9e',
            }}>
                <IconComponent sx={{ fontSize: { xs: '1.2rem', sm: '1.8rem' } }} />
            </Box>
        </Box>
        
        {/* TEXT - Tăiat la 2 linii */}
        <Box sx={{ 
            width: '100%', 
            height: '35px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mb: 0.5 
        }}>
            <Typography 
                variant="subtitle2" 
                align="center"
                sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.65rem', sm: '0.8rem' },
                    color: isActive ? '#333' : '#757575',
                    lineHeight: 1.1,
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2, 
                }}
            >
                {category.label}
            </Typography>
        </Box>

        {!isActive && (
            <Box sx={{ position: 'absolute', top: 2, left: 2, bgcolor: '#e0e0e0', px: 0.5, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '0.5rem', fontWeight: 'bold' }}>OFF</Typography>
            </Box>
        )}
    </Paper>
  );
};

export default memo(CategoryFolderCard);