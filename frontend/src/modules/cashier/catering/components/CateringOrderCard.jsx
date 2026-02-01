import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom'; 
import { Paper, Box, Typography, IconButton, Stack, Divider, Tooltip } from '@mui/material';
import dayjs from 'dayjs';

// Importuri Iconițe
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; 

const CateringOrderCard = ({ group, onEdit, onDelete }) => {
  const navigate = useNavigate();
  
  const { reservationName, reservationNote, items, sortTime } = group;
  const hasReservation = !!group.reservationId;

  // Funcția de navigare către pagina de rezervări
  const handleGoToReservation = () => {
    const rawDate = items[0]?.orderDate; 
    if (rawDate) {        
        const formattedDate = dayjs(rawDate).format('YYYY-MM-DD');
        navigate(`/home/reservations?date=${formattedDate}`);
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        border: hasReservation ? '1px solid #1976d2' : '1px solid #e0e0e0',
        borderRadius: 2,
        bgcolor: 'white'
      }}
    >
      {/* HEADER */}
      <Box 
        sx={{ 
            p: 1.5, 
            bgcolor: hasReservation ? '#e3f2fd' : '#f5f5f5', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
        }}
      >
        <Box display="flex" alignItems="center" gap={1} overflow="hidden">
            
            {/* --- NOU: ORA DE START (Simplă, fără chenar) --- */}
            {sortTime && (
                <Box display="flex" alignItems="center" gap={0.5} sx={{ color: 'text.secondary' }}>
                    <AccessTimeIcon sx={{ fontSize: 18 }} />
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                        {dayjs(sortTime).format('HH:mm')}
                    </Typography>
                    {/* Un mic separator vizual între oră și nume */}
                    <Typography color="text.disabled" sx={{ mx: 0.5 }}>|</Typography>
                </Box>
            )}
            {/* ----------------------------------------------- */}

            {/* NUME PĂRINTE / TITLU */}
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary" noWrap>
                {reservationName || `Rezervare #${group.reservationId}`}
            </Typography>

            {/* NOTIȚE */}
            {reservationNote && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }} noWrap>
                    ({reservationNote})
                </Typography>
            )}
        </Box>

        {/* ZONA BUTOANE */}
        <Box display="flex" gap={0.5}>
            
            {/* 1. BUTON NAVIGARE REZERVARE */}
            {hasReservation && (
                <Tooltip title="Mergi la Rezervare">
                    <IconButton size="small" onClick={handleGoToReservation} color="info">
                        <EventIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            {/* 2. BUTON EDITARE */}
            <Tooltip title="Editează Comanda">
                <IconButton size="small" onClick={() => onEdit(group)} color="primary">
                    <EditIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* 3. BUTON ȘTERGERE */}
            <Tooltip title="Șterge Comanda">
                <IconButton size="small" onClick={() => onDelete(group)} color="error">
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>

        </Box>
      </Box>

      <Divider />

      {/* LISTA PRODUSE */}
      <Stack divider={<Divider flexItem />}>
        {items.map((order) => (
          <Box key={order.id} sx={{ p: 1, px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            
            {/* CASETA CANTITATE */}
            <Box sx={{ 
                width: 36,
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: '#f5f5f5', 
                borderRadius: 1,
                py: 0.5
            }}>
              <Typography variant="body1" fontWeight="bold" color="primary" sx={{ lineHeight: 1 }}>
                {order.quantity}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1, opacity: 0.7 }}>
                buc
              </Typography>
            </Box>

            {/* NUME PRODUS */}
            <Typography variant="body2" fontWeight="500">
              {order.productName}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

CateringOrderCard.propTypes = {
  group: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default CateringOrderCard;