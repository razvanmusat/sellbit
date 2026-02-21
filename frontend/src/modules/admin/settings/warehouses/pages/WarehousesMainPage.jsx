import React from 'react';
import { 
    Box, Button, Typography, CircularProgress, 
    Accordion, AccordionSummary, AccordionDetails, 
    Alert, Snackbar, List, ListItem, ListItemText, IconButton, 
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Paper, Tooltip, Chip
} from '@mui/material';

// ICONS
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import StoreIcon from '@mui/icons-material/Store';
import WarehouseIcon from '@mui/icons-material/Warehouse';

// Hooks & Components
import { useWarehousesMainPage } from '../hooks/useWarehousesMainPage';
import WarehouseFormModal from '../components/WarehouseFormModal';

const WarehousesMainPage = () => {
    const {
        activeWarehouses,
        inactiveWarehouses,
        loading,
        isModalOpen,
        editItem,
        handleOpenCreate,
        handleOpenEdit,
        handleCloseModal,
        handleFormSubmit,
        confirmDialog,
        handleRequestToggle,
        handleCloseConfirmDialog,
        handleConfirmToggle,
        snackbar,
        closeSnackbar
    } = useWarehousesMainPage();

    const renderWarehouseItem = (wh, isActive) => (
        <Paper key={wh.id} variant="outlined" sx={{ mb: 1, '&:hover': { bgcolor: 'grey.50' } }}>
            <ListItem
                secondaryAction={
                    isActive ? (
                        <>
                            <Tooltip title="Editează">
                                <IconButton edge="end" aria-label="edit" color="primary" onClick={() => handleOpenEdit(wh)} sx={{ mr: 1 }}>
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Dezactivează">
                                <IconButton edge="end" aria-label="delete" color="error" onClick={() => handleRequestToggle(wh)}>
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                        </>
                    ) : (
                        <Tooltip title="Reactivează">
                            <Button 
                                variant="outlined" 
                                color="success" 
                                size="small" 
                                startIcon={<RestoreFromTrashIcon />}
                                onClick={() => handleRequestToggle(wh)}
                            >
                                Reactivează
                            </Button>
                        </Tooltip>
                    )
                }
            >
                <ListItemText 
                    primary={
                        <Typography variant="subtitle1" fontWeight="bold" component="span">
                            {wh.name}
                        </Typography>
                    }
                    secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                                label={wh.code} 
                                size="small" 
                                color={isActive ? "primary" : "default"} 
                                variant={isActive ? "filled" : "outlined"}
                                sx={{ fontWeight: 'bold', borderRadius: 1 }}
                            />
                        </Box>
                    }
                    /* FIX PENTRU DIV IN P: Schimbam elementul root al textului secundar din p in span */
                    slotProps={{ secondary: { component: 'span' } }}
                />
            </ListItem>
        </Paper>
    );

    return (
        <Box sx={{ 
            p: 3, 
            height: '100%', 
            overflowY: 'auto',
            /* REZERVARE SPATIU SCROLL: Stable asigura ca nu se misca pagina la stanga */
            scrollbarGutter: 'stable' 
        }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h5" component="h1" fontWeight="bold" color="text.primary">
                    Gestiuni
                </Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                >
                    Adaugă Gestiune
                </Button>
            </Box>

            {loading && activeWarehouses.length === 0 ? (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : (
                <Box display="flex" flexDirection="column" gap={3}>
                    
                    {/* 1. ACTIVE WAREHOUSES */}
                    <Accordion defaultExpanded elevation={2}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#e3f2fd' }}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <StoreIcon color="primary" />
                                <Typography variant="h6" fontWeight="bold" color="primary.main">
                                    Gestiuni Active ({activeWarehouses.length})
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: '#fafafa', p: 2 }}>
                            {activeWarehouses.length === 0 ? (
                                <Alert severity="info">Nu există gestiuni active. Adaugă una nouă.</Alert>
                            ) : (
                                <List disablePadding>
                                    {activeWarehouses.map(wh => renderWarehouseItem(wh, true))}
                                </List>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    {/* 2. INACTIVE WAREHOUSES */}
                    {inactiveWarehouses.length > 0 && (
                        <Accordion elevation={1}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f5f5f5' }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <WarehouseIcon color="disabled" />
                                    <Typography variant="h6" fontWeight="medium" color="text.secondary">
                                        Arhivă / Inactive ({inactiveWarehouses.length})
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 2 }}>
                                <List disablePadding>
                                    {inactiveWarehouses.map(wh => renderWarehouseItem(wh, false))}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    )}
                </Box>
            )}

            <WarehouseFormModal 
                open={isModalOpen} 
                onClose={handleCloseModal} 
                onSubmit={handleFormSubmit}
                initialData={editItem}
            />

            <Dialog
                open={confirmDialog.open}
                onClose={handleCloseConfirmDialog}
                disableScrollLock={false}
            >
                <DialogTitle>
                    {confirmDialog.type === 'DEACTIVATE' ? "Confirmare Dezactivare" : "Confirmare Reactivare"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText component="div">
                        {confirmDialog.type === 'DEACTIVATE' ? (
                            <Box>
                                Ești sigur că vrei să dezactivezi gestiunea <strong>{confirmDialog.warehouse?.name}</strong>?
                                <br/>
                                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                    Atenție: Nu o poți dezactiva dacă are stoc existent.
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                Ești sigur că vrei să reactivezi gestiunea <strong>{confirmDialog.warehouse?.name}</strong>?
                            </Box>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog} color="inherit">
                        Nu, Anulează
                    </Button>
                    <Button 
                        onClick={handleConfirmToggle} 
                        color={confirmDialog.type === 'DEACTIVATE' ? "error" : "success"} 
                        variant="contained" 
                    >
                        {confirmDialog.type === 'DEACTIVATE' ? "Da, Dezactivează" : "Da, Reactivează"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled" onClose={closeSnackbar}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WarehousesMainPage;