import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; 
import FolderIcon from '@mui/icons-material/Folder'; // Alternativă dacă vrei folder clasic

const CategoryFolderCard = ({ category, onClick }) => {
  // Verificăm dacă e inactivă pentru stilizare vizuală
  const isActive = category.isActive !== false; 

  return (
    <Paper 
        elevation={2}
        onClick={() => onClick(category)}
        sx={{ 
            // Aceleași dimensiuni și proporții ca în POS
            width: '100%',
            aspectRatio: '1/1', // Pătrat perfect
            position: 'relative',
            cursor: 'pointer', 
            borderRadius: 3, 
            bgcolor: isActive ? '#ffffff' : '#f5f5f5', // Gri dacă e inactiv
            border: isActive ? 'none' : '1px dashed #bdbdbd',
            transition: 'all 0.1s ease-in-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            
            '&:active': { transform: 'scale(0.96)' },
            '&:hover': { 
                bgcolor: isActive ? '#fafafa' : '#eeeeee',
                boxShadow: 4 
            }
        }}
    >
        {/* Cerc Iconiță */}
        <Box 
            sx={{ 
                width: '45%', 
                height: '45%', 
                bgcolor: isActive ? '#fff3e0' : '#e0e0e0', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5
            }}
        >
            <RestaurantMenuIcon 
                sx={{ 
                    fontSize: '2rem', 
                    color: isActive ? '#f57c00' : '#9e9e9e' 
                }} 
            />
        </Box>
        
        {/* Text */}
        <Box sx={{ width: '90%', px: 0.5 }}>
            <Typography 
                variant="subtitle2" 
                align="center"
                sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    color: isActive ? '#333' : '#757575',
                    lineHeight: 1.2,
                    // Trunchiere la 2 linii
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                }}
            >
                {category.label}
            </Typography>
            {/* Afișăm codul mic dedesubt pentru admin */}
            <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.5 }}>
                {category.code}
            </Typography>
        </Box>

        {/* Badge Inactiv (Opțional) */}
        {!isActive && (
            <Box sx={{ position: 'absolute', top: 5, right: 5, bgcolor: '#e0e0e0', px: 0.5, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>OFF</Typography>
            </Box>
        )}
    </Paper>
  );
};

export default CategoryFolderCard;