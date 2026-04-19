import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Paper, Box, Typography, Chip, IconButton, Divider, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import PaidIcon from '@mui/icons-material/Paid';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import ColorLensIcon from '@mui/icons-material/ColorLens';

const ReservationCard = React.memo(({ reservation, onEdit, onDelete, onAddCatering, onConfirmDigitalInvitation, onConfirmTheme, isAdmin }) => {
  const start = dayjs(reservation.startAt);
  const end = dayjs(reservation.endAt);
  const now = dayjs();

  const hasAdvance = reservation.advanceAmount && reservation.advanceAmount > 0;
  const isFinished = now.isAfter(end);

  return (
    <Paper
      elevation={1}
      sx={{
        borderLeft: '5px solid',
        borderColor: isFinished ? '#bdbdbd' : hasAdvance ? 'success.main' : 'warning.main',
        opacity: isFinished ? 0.75 : 1,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
        overflow: 'hidden',
      }}
    >

      {/* ============================================================
          DESKTOP (sm+) — 3 coloane: ora | detalii | actiuni
      ============================================================ */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'stretch' }}>

        {/* COLOANA STÂNGA — ORA */}
        <Box sx={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          px: 1.5, py: 1,
          bgcolor: isFinished ? '#f5f5f5' : '#f0f7ff',
          minWidth: 90,
        }}>
          <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary', mb: 0.3 }} />
          <Typography variant="body1" fontWeight="bold" color="primary.main" sx={{ whiteSpace: 'nowrap' }}>
            {start.format('HH:mm')} - {end.format('HH:mm')}
          </Typography>
          {isFinished && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.3 }}>
              Finalizat
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* COLOANA CENTRU — DETALII */}
        <Box sx={{ flex: 1, px: 1.5, py: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="body1" fontWeight="bold">
              {reservation.parentName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <PhoneIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{reservation.parentPhone}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', mb: 0.5 }}>
            {hasAdvance ? (
              <Chip icon={<PaidIcon />} label={`Avans: ${reservation.advanceAmount} RON`} size="small" color="success" variant="outlined" />
            ) : (
              <Chip label="Fără avans" size="small" color="warning" variant="outlined" />
            )}
            {reservation.theme && reservation.themeConfirmed === true && (
              <Chip icon={<CheckCircleIcon />} label={`Tematică: ${reservation.theme}`} size="small" color="success" />
            )}
            {reservation.theme && !reservation.themeConfirmed && (
              <Chip
                icon={<ColorLensIcon />}
                label={`Tematică: ${reservation.theme}`}
                size="small"
                onClick={isAdmin ? () => onConfirmTheme(reservation) : undefined}
                sx={{
                  bgcolor: '#fff3e0', color: '#e65100',
                  cursor: isAdmin ? 'pointer' : 'default',
                  '&:hover': isAdmin ? { bgcolor: '#ffe0b2' } : {},
                }}
              />
            )}
            {reservation.digitalInvitation === true && (
              <Chip icon={<CheckCircleIcon />} label="Invitație creată" size="small" color="success" />
            )}
            {reservation.digitalInvitation === null && (
              <Chip
                icon={<MailOutlineIcon />}
                label="Invitație de creat"
                size="small"
                onClick={isAdmin ? () => onConfirmDigitalInvitation(reservation) : undefined}
                sx={{
                  bgcolor: '#fff3e0', color: '#e65100',
                  cursor: isAdmin ? 'pointer' : 'default',
                  '&:hover': isAdmin ? { bgcolor: '#ffe0b2' } : {},
                }}
              />
            )}
            {reservation.digitalInvitation === false && (
              <Chip icon={<DoNotDisturbIcon />} label="Fără invitație" size="small" variant="outlined" />
            )}
          </Box>

          {reservation.note ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 0.5 }} noWrap>
              <b style={{ fontStyle: 'normal' }}>Notă:</b> {reservation.note}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.5 }}>
              Nu există notițe
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* COLOANA DREAPTA — ACȚIUNI */}
        <Box sx={{
          display: 'flex', flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center',
          px: 1, gap: 0.5,
        }}>
          <Tooltip title="Catering">
            <IconButton onClick={() => onAddCatering(reservation)} sx={{ color: '#9c27b0', '&:hover': { bgcolor: 'rgba(156,39,176,0.1)' } }}>
              <RestaurantMenuIcon fontSize="medium" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editează">
            <IconButton color="primary" onClick={() => onEdit(reservation)}>
              <EditIcon fontSize="medium" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Șterge">
            <IconButton color="error" onClick={() => onDelete(reservation)}>
              <DeleteIcon fontSize="medium" />
            </IconButton>
          </Tooltip>
        </Box>

      </Box>

      {/* ============================================================
          MOBILE (xs) — rând 1: ora + actiuni | rând 2: detalii
      ============================================================ */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column' }}>

        {/* RÂND 1: ORA (stânga) + ACȚIUNI (dreapta) */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 1.5, pt: 1, pb: 0.5,
          bgcolor: isFinished ? '#f5f5f5' : '#f0f7ff',
          borderBottom: '1px solid #e0e0e0',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
  {isFinished ? (
    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
  ) : (
    <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
  )}
  <Typography variant="body1" fontWeight="bold" color={isFinished ? 'text.secondary' : 'primary.main'}>
    {start.format('HH:mm')} - {end.format('HH:mm')}
  </Typography>
</Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <Tooltip title="Catering">
              <IconButton size="small" onClick={() => onAddCatering(reservation)} sx={{ color: '#9c27b0' }}>
                <RestaurantMenuIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editează">
              <IconButton size="small" color="primary" onClick={() => onEdit(reservation)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Șterge">
              <IconButton size="small" color="error" onClick={() => onDelete(reservation)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* RÂND 2: DETALII */}
        <Box sx={{ px: 1.5, py: 1 }}>

          {/* Nume + telefon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
  <Typography variant="body1" fontWeight="bold">
    {reservation.parentName}
  </Typography>
  <Box
    component="a"
    href={`tel:${reservation.parentPhone}`}
    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', textDecoration: 'none' }}
  >
    <PhoneIcon sx={{ fontSize: 16 }} />
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {reservation.parentPhone}
    </Typography>
  </Box>
</Box>

          {/* Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', mb: 0.5 }}>
            {hasAdvance ? (
              <Chip icon={<PaidIcon />} label={`Avans: ${reservation.advanceAmount} RON`} size="small" color="success" variant="outlined" />
            ) : (
              <Chip label="Fără avans" size="small" color="warning" variant="outlined" />
            )}
            {reservation.theme && reservation.themeConfirmed === true && (
              <Chip icon={<CheckCircleIcon />} label={`Tematică: ${reservation.theme}`} size="small" color="success" />
            )}
            {reservation.theme && !reservation.themeConfirmed && (
              <Chip
                icon={<ColorLensIcon />}
                label={`Tematică: ${reservation.theme}`}
                size="small"
                onClick={isAdmin ? () => onConfirmTheme(reservation) : undefined}
                sx={{
                  bgcolor: '#fff3e0', color: '#e65100',
                  cursor: isAdmin ? 'pointer' : 'default',
                  '&:hover': isAdmin ? { bgcolor: '#ffe0b2' } : {},
                }}
              />
            )}
            {reservation.digitalInvitation === true && (
              <Chip icon={<CheckCircleIcon />} label="Invitație creată" size="small" color="success" />
            )}
            {reservation.digitalInvitation === null && (
              <Chip
                icon={<MailOutlineIcon />}
                label="Invitație de creat"
                size="small"
                onClick={isAdmin ? () => onConfirmDigitalInvitation(reservation) : undefined}
                sx={{
                  bgcolor: '#fff3e0', color: '#e65100',
                  cursor: isAdmin ? 'pointer' : 'default',
                  '&:hover': isAdmin ? { bgcolor: '#ffe0b2' } : {},
                }}
              />
            )}
            {reservation.digitalInvitation === false && (
              <Chip icon={<DoNotDisturbIcon />} label="Fără invitație" size="small" variant="outlined" />
            )}
          </Box>

          {/* Notă */}
          {reservation.note ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              <b style={{ fontStyle: 'normal' }}>Notă:</b> {reservation.note}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
              Nu există notițe
            </Typography>
          )}

        </Box>
      </Box>

    </Paper>
  );
});

ReservationCard.displayName = 'ReservationCard';

ReservationCard.propTypes = {
  reservation: PropTypes.object.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onAddCatering: PropTypes.func,
  onConfirmDigitalInvitation: PropTypes.func,
  onConfirmTheme: PropTypes.func,
  isAdmin: PropTypes.bool,
};

export default ReservationCard;