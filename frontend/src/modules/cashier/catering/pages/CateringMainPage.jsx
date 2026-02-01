import React from 'react';
import { 
  Box, Paper, Typography, Button, IconButton, 
  CircularProgress, Alert, Stack, Divider, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro'; 

import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today'; // Am adăugat importul

import CateringOrderCard from '../components/CateringOrderCard';
import CateringOrderModal from '../components/CateringOrderModal';
import { useCateringMainPage } from '../hooks/useCateringMainPage';

const CateringMainPage = () => {
  const {
    selectedDate, groupedOrders, loading, error, submitting,
    openModal, editingGroup, toast,
    
    deleteGroup, 
    handleOpenDelete, 
    handleCloseDelete, 
    handleConfirmDelete,

    handleDateChange, handlePrevDay, handleNextDay, handleGoToToday, handleRefresh, // Am extras handleGoToToday
    handleOpenAdd, handleEditGroup, handleCloseModal, 
    handleSubmit, setToast
  } = useCateringMainPage();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* --- HEADER RESPONSIVE --- */}
        <Paper 
            elevation={0} 
            sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: '#f5f5f5', 
                border: '1px solid #e0e0e0', 
                display: 'flex', 
                // RESPONSIVE: Coloană pe mobil, Rând pe Laptop
                flexDirection: { xs: 'column', md: 'row' }, 
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: { xs: 2, md: 0 }
            }}
        >
          
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              flexDirection: { xs: 'column', md: 'row' },
              width: { xs: '100%', md: 'auto' }
          }}>
            <Box display="flex" alignItems="center" gap={1} color="primary.main" mr={1}>
                <RestaurantMenuIcon />
                <Typography variant="h6" fontWeight="bold">Catering</Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <IconButton onClick={handlePrevDay} title="Ziua anterioară">
                    <ChevronLeftIcon />
                </IconButton>

                <DatePicker 
                    label="Selectează Data"
                    value={selectedDate} 
                    onChange={handleDateChange} 
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { size: 'small', sx: { bgcolor: 'white', width: 160 } } }} 
                />

                <IconButton onClick={handleNextDay} title="Ziua următoare">
                    <ChevronRightIcon />
                </IconButton>

                <IconButton onClick={handleRefresh} disabled={loading} title="Reîncarcă">
                    <RefreshIcon />
                </IconButton>

                {/* --- BUTONUL AZI (După Refresh) --- */}
                <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={handleGoToToday}
                    startIcon={<TodayIcon />}
                    sx={{ 
                        textTransform: 'none', 
                        ml: 1, 
                        bgcolor: 'white',
                        '&:hover': { bgcolor: '#f0f0f0' }
                    }}
                >
                    Azi
                </Button>
                {/* ---------------------------------- */}
            </Box>
          </Box>

          <Button 
            variant="contained" 
            startIcon={<AddCircleIcon />} 
            onClick={handleOpenAdd}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            Comandă Nouă
          </Button>
        </Paper>
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && !submitting ? (
             <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box> 
          ) : error ? ( 
             <Alert severity="error">{error}</Alert> 
          ) : groupedOrders.length === 0 ? (
             <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="50%" color="text.secondary" gap={1}>
                 <RestaurantMenuIcon sx={{ fontSize: 60, opacity: 0.2 }} />
                 <Typography>Lipsă comenzi.</Typography>
             </Box> 
          ) : (
             <Stack spacing={2} sx={{ pb: 4 }}>
                 {groupedOrders.map((group) => (
                     <CateringOrderCard 
                        key={group.id} 
                        group={group} 
                        onEdit={handleEditGroup} 
                        onDelete={handleOpenDelete} 
                      />
                 ))}
             </Stack>
          )}
        </Box>

        <CateringOrderModal 
            open={openModal} 
            onClose={handleCloseModal} 
            onSubmit={handleSubmit} 
            editData={editingGroup} 
            context={{ reservationDate: selectedDate }} 
        />
        
        <Dialog open={!!deleteGroup} onClose={handleCloseDelete}>
            <DialogTitle>Confirmare Ștergere</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Sigur vrei să ștergi comanda pentru <b>{deleteGroup?.reservationName}</b>?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDelete} color="inherit">Anulează</Button>
                <Button onClick={handleConfirmDelete} color="error" variant="contained">Șterge</Button>
            </DialogActions>
        </Dialog>

        <Snackbar 
            open={toast.open} 
            autoHideDuration={3000} 
            onClose={() => setToast({...toast, open: false})} 
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default CateringMainPage;