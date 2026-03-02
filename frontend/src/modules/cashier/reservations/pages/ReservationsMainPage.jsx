import React from 'react';
import { 
  Box, Paper, Typography, Button, IconButton, 
  CircularProgress, Alert, Stack, Divider, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro'; 

import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EventIcon from '@mui/icons-material/Event';
import WarningAmberIcon from '@mui/icons-material/WarningAmber'; 
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today'; 

import { useReservationsMainPage } from '../hooks/useReservationsMainPage';
import ReservationModal from '../components/ReservationModal';
import ReservationCard from '../components/ReservationCard';
import CateringOrderModal from '../../catering/components/CateringOrderModal';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler'; 
import dayjs from 'dayjs';

const ReservationsMainPage = () => {
  const {
    selectedDate, reservations, loadingList, listError,
    openModal, editingReservation, deleteId, submitting, toast, setToast,
    
    cateringModalOpen, reservationForCatering,
    handleOpenCatering, handleCloseCatering, handleSubmitCatering,

    cateringConflict, 
    handleRedirectToCatering, 
    handleCloseConflict,

    filterOption,
    handleFilterOptionChange,
    rangeModalOpen,
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    handleCloseRangeModal,
    handleApplyCustomRange,
    emptyStateLabel,
    selectedIntervalLabel,
    viewMode,
    groupedReservationsByDay,
    isAdmin,
    confirmInvitationReservation,
    handleOpenConfirmInvitation,
    handleCloseConfirmInvitation,
    handleConfirmInvitation,

    handleChangeDate, handlePrevDay, handleNextDay, handleGoToToday, handleRefresh, 
    handleOpenAdd, handleOpenEdit, handleCloseModal, 
    handleOpenDelete, handleCloseDelete, handleSubmit, handleConfirmDelete
  } = useReservationsMainPage();

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
                <EventIcon />
                <Typography variant="h6" fontWeight="bold">Rezervări</Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
            
            {/* Controalele de dată */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <IconButton onClick={handlePrevDay} title="Ziua anterioară">
                    <ChevronLeftIcon />
                </IconButton>

                <DatePicker 
                    label="Selectează Data"
                    value={selectedDate}
                    onChange={handleChangeDate}
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { size: 'small', sx: { bgcolor: 'white', width: 160 } } }}
                />

                <IconButton onClick={handleNextDay} title="Ziua următoare">
                    <ChevronRightIcon />
                </IconButton>

                <IconButton onClick={handleRefresh} disabled={loadingList} title="Reîncarcă">
                    <RefreshIcon />
                </IconButton>
                
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

                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleFilterOptionChange('currentMonth')}
                    sx={{
                        textTransform: 'none',
                        ml: 1,
                        bgcolor: 'white',
                        '&:hover': { bgcolor: '#f0f0f0' }
                    }}
                >
                    Luna curentă
                </Button>

                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleFilterOptionChange('customInterval')}
                    sx={{
                        textTransform: 'none',
                        ml: 1,
                        bgcolor: 'white',
                        '&:hover': { bgcolor: '#f0f0f0' }
                    }}
                >
                  {filterOption === 'customInterval' ? selectedIntervalLabel : 'Selectează interval'}
                </Button>
            </Box>
          </Box>

          <Button 
            variant="contained" 
            startIcon={<AddCircleIcon />} 
            onClick={handleOpenAdd}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            Rezervare Nouă
          </Button>
        </Paper>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loadingList ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : listError ? (
            <Alert severity="error">{getFriendlyErrorMessage(listError)}</Alert>
          ) : reservations.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="50%" color="text.secondary" gap={1}>
                <EventIcon sx={{ fontSize: 60, opacity: 0.2 }} />
                <Typography>Nu există rezervări pentru <b>{emptyStateLabel}</b>.</Typography>
            </Box>
          ) : viewMode === 'day' ? (
            <Stack spacing={1}>
                {reservations.map((res) => (
                    <ReservationCard 
                        key={res.id} 
                        reservation={res}
                        onEdit={handleOpenEdit} 
                        onDelete={handleOpenDelete} 
                        onAddCatering={handleOpenCatering}
                      onConfirmDigitalInvitation={handleOpenConfirmInvitation}
                      isAdmin={isAdmin}
                    />
                ))}
            </Stack>
          ) : (
            <Stack spacing={2}>
              {groupedReservationsByDay.map((dayGroup) => (
                <Box key={dayGroup.dateKey}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, textTransform: 'capitalize' }}>
                    {dayGroup.title}
                  </Typography>
                  <Stack spacing={1}>
                    {dayGroup.reservations.map((res) => (
                      <ReservationCard 
                        key={res.id} 
                        reservation={res}
                        onEdit={handleOpenEdit} 
                        onDelete={handleOpenDelete} 
                        onAddCatering={handleOpenCatering}
                        onConfirmDigitalInvitation={handleOpenConfirmInvitation}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
        
        <ReservationModal 
            open={openModal}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
            selectedDate={selectedDate}
            loading={submitting}
            editData={editingReservation}
        />

        <CateringOrderModal 
            open={cateringModalOpen}
            onClose={handleCloseCatering}
            onSubmit={handleSubmitCatering}
            editData={null}
            context={{
                reservationId: reservationForCatering?.id,
                reservationDate: reservationForCatering?.startAt 
            }}
        />

        <Dialog open={!!deleteId} onClose={handleCloseDelete}>
            <DialogTitle>Confirmare Ștergere</DialogTitle>
            <DialogContent>
                <DialogContentText>Sigur vrei să ștergi această rezervare?</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDelete} color="inherit">Anulează</Button>
                <Button onClick={handleConfirmDelete} color="error" variant="contained">Șterge</Button>
            </DialogActions>
        </Dialog>

        <Dialog open={!!cateringConflict} onClose={handleCloseConflict}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
                <WarningAmberIcon /> Comandă Existentă
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Există deja o comandă activă pentru rezervarea <b>{cateringConflict?.parentName}</b>.
                    <br /><br />
                    Vrei să mergi la pagina de Catering pentru data de <b>{dayjs(cateringConflict?.startAt).format('DD/MM/YYYY')}</b> să o vezi/editezi?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseConflict} color="inherit">Nu</Button>
                <Button onClick={handleRedirectToCatering} variant="contained" color="primary">Da, Mergi la Comandă</Button>
            </DialogActions>
        </Dialog>

          <Dialog open={!!confirmInvitationReservation} onClose={handleCloseConfirmInvitation} maxWidth="xs" fullWidth>
            <DialogTitle>Confirmare invitație digitală</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Ai creat invitația digitală?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfirmInvitation} color="inherit">Nu</Button>
              <Button onClick={handleConfirmInvitation} variant="contained" color="success">Da</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={rangeModalOpen} onClose={handleCloseRangeModal} maxWidth="xs" fullWidth>
            <DialogTitle>Selectează interval</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <DatePicker
                  label="Data start"
                  value={rangeStart}
                  onChange={setRangeStart}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <DatePicker
                  label="Data end"
                  value={rangeEnd}
                  onChange={setRangeEnd}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseRangeModal} color="inherit">Anulează</Button>
              <Button onClick={handleApplyCustomRange} variant="contained">Aplică</Button>
            </DialogActions>
          </Dialog>

        <Snackbar 
            open={toast.open} 
            autoHideDuration={4000} 
            onClose={() => setToast({...toast, open: false})}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
        </Snackbar>

      </Box>
    </LocalizationProvider>
  );
};

export default ReservationsMainPage;