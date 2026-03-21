import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography,
  IconButton, List, ListItem, ListItemText,
  InputAdornment, Divider, Paper, ClickAwayListener
} from '@mui/material';

// --- IMPORTURI ICONIȚE ---
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CloseIcon from '@mui/icons-material/Close';

import { useCateringOrderModal } from '../hooks/useCateringOrderModal';

const CateringOrderModal = ({ open, onClose, onSubmit, editData, context }) => {
  const inputRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const {
    basket, searchTerm, setSearchTerm, showDropdown, setShowDropdown,
    availableProducts, displayDate,
    handleAddToBasket, handleUpdateQuantity, handleManualQuantity, submitBasket
  } = useCateringOrderModal(open, editData, context, onSubmit);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [availableProducts.length]);

  useEffect(() => {
    if (open && !editData) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, editData]);

  const onAddItem = (prod) => {
    setShowDropdown(false);
    handleAddToBasket(prod);    
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
        if (showDropdown) {
            e.preventDefault();
            e.stopPropagation(); 
            setShowDropdown(false);
            return;
        }
    }

    if (!showDropdown || availableProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % availableProducts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + availableProducts.length) % availableProducts.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedProd = availableProducts[highlightedIndex];
      if (selectedProd) {
        onAddItem(selectedProd);
      }
    }
  };

  return (
    <Dialog 
        open={open} 
        onClose={(event, reason) => {
            if (reason === 'escapeKeyDown' && showDropdown) {
                setShowDropdown(false);
            } else {
                onClose();
            }
        }} 
        maxWidth="sm" 
        fullWidth 
        disableRestoreFocus
    >
        {/* TITLU + BUTON X */}
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #eee' }}>
            <RestaurantMenuIcon color="primary" />
            <Box>
                <Typography variant="h6" component="div">
                    {editData ? "Editare Comandă" : "Adaugă Produse"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Data: <b>{displayDate.format('DD/MM/YYYY')}</b>
                </Typography>
            </Box>

            {/* ↓↓↓ BUTONUL X PENTRU ÎNCHIDERE RAPIDĂ ↓↓↓ */}
            <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
            >
                <CloseIcon />
            </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, minHeight: '400px' }}>
          
          <ClickAwayListener onClickAway={() => setShowDropdown(false)}>
            <Box sx={{ position: 'relative', mt: 2 }}>
                <TextField
                    inputRef={inputRef}
                    fullWidth
                    label="Caută Produs..."
                    placeholder="Caută Produs..."
                    value={searchTerm}                    
                    onClick={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDown} 
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    autoComplete="off"
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }
                    }}
                />
                
                {showDropdown && availableProducts.length > 0 && (
                    <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300, maxHeight: 200, overflowY: 'auto', mt: 0.5 }}>
                        <List dense>
                            {availableProducts.map((prod, index) => {
                                const isHighlighted = index === highlightedIndex;
                                return (
                                    <ListItem 
                                        key={prod.id} 
                                        onClick={() => onAddItem(prod)}
                                        divider
                                        sx={{ 
                                            cursor: 'pointer', 
                                            bgcolor: isHighlighted ? 'action.hover' : 'inherit',
                                            borderLeft: isHighlighted ? '4px solid #1976d2' : '4px solid transparent',
                                            '&:hover': { bgcolor: 'action.hover' } 
                                        }}
                                        ref={(el) => {
                                            if (isHighlighted && el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                            }
                                        }}
                                    >
                                        <ListItemText primary={prod.name} />
                                        <AddCircleOutlineIcon color={isHighlighted ? "primary" : "action"} fontSize="small" />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                )}
            </Box>
          </ClickAwayListener>

          <Divider>LISTĂ</Divider>

          <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#f9f9f9', borderRadius: 1, p: 1, border: '1px solid #eee' }}>
              <List dense>
                  {basket.map((item) => (
                      <ListItem key={item.product.id} divider sx={{ px: 0 }}>
                          <ListItemText 
                            primary={item.product.name} 
                            slotProps={{ 
                                primary: { fontWeight: 'bold' } 
                            }}
                          />
                          <Box display="flex" alignItems="center" gap={1}>
                              <IconButton size="small" onClick={() => handleUpdateQuantity(item.product.id, -1)} color="error">
                                  {item.quantity === 1 ? <DeleteIcon fontSize="small"/> : <RemoveCircleOutlineIcon fontSize="small"/>}
                              </IconButton>
                              
                              <TextField 
                                  size="small"
                                  value={item.quantity}
                                  onChange={(e) => handleManualQuantity(item.product.id, e.target.value)}
                                  slotProps={{
                                      htmlInput: { 
                                          style: { textAlign: 'center', padding: '0', width: '30px' } 
                                      }
                                  }}
                              />

                              <IconButton size="small" onClick={() => handleUpdateQuantity(item.product.id, 1)} color="primary">
                                  <AddCircleOutlineIcon fontSize="small"/>
                              </IconButton>
                          </Box>
                      </ListItem>
                  ))}
                  {basket.length === 0 && <Typography variant="body2" align="center" sx={{ opacity: 0.5, mt: 2 }}>Lista e goală</Typography>}
              </List>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button onClick={onClose} color="inherit">Anulează</Button>
          <Button onClick={submitBasket} variant="contained" color="primary" startIcon={<SaveIcon />}>Salvează</Button>
        </DialogActions>
    </Dialog>
  );
};

CateringOrderModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  editData: PropTypes.object,
  context: PropTypes.object
};

export default CateringOrderModal;