import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Paper, Box, Typography, Chip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import PaidIcon from '@mui/icons-material/Paid';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
// 👇 IMPORT NOU
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

// Folosim React.memo aici pentru a preveni randările inutile
// 👇 AM ADĂUGAT PROP-UL 'onAddCatering'
const ReservationCard = React.memo(({ reservation, onEdit, onDelete, onAddCatering }) => {
  const start = dayjs(reservation.startAt);
  const end = dayjs(reservation.endAt);
  const now = dayjs(); 

  const hasAdvance = reservation.advanceAmount && reservation.advanceAmount > 0;
  const isFinished = now.isAfter(end);

  return (
    <Paper 
        elevation={2} 
        sx={{ 
            p: 2, 
            borderLeft: '6px solid',
            borderColor: hasAdvance ? 'success.main' : 'warning.main',
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            position: 'relative',
            overflow: 'hidden'
        }}
    >
      {/* --- ȘTAMPILA "FINALIZAT" --- */}
      {isFinished && (
        <Box
            sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-15deg)', 
                color: '#2e7d32', 
                opacity: 0.15,
                pointerEvents: 'none', 
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <DoneRoundedIcon sx={{ fontSize: 120 }} />
        </Box>
      )}

      {/* 1. ORA */}
      <Box sx={{ 
          minWidth: { xs: '100%', sm: 120 }, 
          textAlign: 'center', p: 1, bgcolor: '#f0f7ff', borderRadius: 2,
          display: 'flex', flexDirection: { xs: 'row', sm: 'column' },
          justifyContent: 'center', alignItems: 'center', gap: 1,
          zIndex: 1 
      }}>
        <Typography variant="h5" color="primary.main" fontWeight="bold">
            {start.format('HH:mm')}
        </Typography>
        <Typography variant="caption" color="text.secondary">-</Typography>
        <Typography variant="h6" color="text.secondary">
            {end.format('HH:mm')}
        </Typography>
      </Box>

      {/* 2. DETALII CLIENT */}
      <Box sx={{ flex: 1, width: '100%', zIndex: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            {reservation.parentName}
        </Typography>
        <Box display="flex" alignItems="center" gap={1} color="text.secondary" mb={1} mt={0.5}>
            <PhoneIcon fontSize="small" />
            <Typography variant="body2">{reservation.parentPhone}</Typography>
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap">
            {hasAdvance ? (
                <Chip icon={<PaidIcon />} label={`${reservation.advanceAmount} RON`} size="small" color="success" variant="outlined" />
            ) : (
                <Chip label="Fără Avans" size="small" color="warning" variant="outlined" />
            )}

            {reservation.theme && (
                <Chip label={reservation.theme} size="small" sx={{ bgcolor: '#eee' }} />
            )}
            
            {reservation.digitalInvitation && (
                <Chip label="Invitație Digitală" size="small" color="info" variant="outlined" />
            )}
            
            {isFinished && (
                <Chip label="Finalizat" size="small" color="default" sx={{ fontWeight: 'bold' }} />
            )}
        </Box>

        {reservation.note && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'gray' }}>
                Notă: {reservation.note}
            </Typography>
        )}
      </Box>

      {/* 3. ACȚIUNI */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'row', sm: 'column' }} 
        gap={1} 
        sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end', zIndex: 1 }}
      >
        {/* 👇 BUTON NOU: CATERING */}
        <IconButton 
            color="secondary" 
            onClick={() => onAddCatering(reservation)} 
            size="small" 
            title="Adaugă Catering"
            sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)' }} // Un fundal subtil mov
        >
            <RestaurantMenuIcon />
        </IconButton>

        <IconButton color="primary" onClick={() => onEdit(reservation)} size="small" title="Editează">
            <EditIcon />
        </IconButton>
        <IconButton color="error" onClick={() => onDelete(reservation)} size="small" title="Șterge">
            <DeleteIcon />
        </IconButton>
      </Box>
    </Paper>
  );
});

ReservationCard.displayName = 'ReservationCard';

ReservationCard.propTypes = {
  reservation: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onAddCatering: PropTypes.func
};

export default ReservationCard;