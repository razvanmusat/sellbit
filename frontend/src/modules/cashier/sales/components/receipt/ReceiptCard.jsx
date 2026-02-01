import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Box } from '@mui/material';

// Helper pentru a formata ora dintr-un string ISO (ex: "2024-01-25T10:30:00")
const formatTime = (isoString) => {
  if (!isoString) {
    return 'N/A';
  }
  try {
    const date = new Date(isoString);
    // Formatează ora pentru România (HH:mm)
    return date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Format invalid pentru dată:', isoString);
    return 'Invalid';
  }
};

/**
 * Un card compact ce afișează informațiile esențiale ale unui bon deschis.
 *
 * @param {object} props
 * @param {object} props.receipt - Obiectul bonului de afișat.
 * @param {Function} props.onClick - Funcția apelată la click pe card.
 */
const ReceiptCard = ({ receipt, onClick }) => {
  // Destructurare cu valori default pentru a preveni erorile
  const {
    totalAmount = 0.0,
    userName = 'Necunoscut',
    tableName = 'Fără masă',
    createdAt,
  } = receipt;

  return (
    <Card onClick={() => onClick(receipt.id)} sx={{ width: { xs: '100%', sm: 220 }, cursor: 'pointer', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="h6" component="div" fontWeight="bold" noWrap>
          {tableName}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 1 }}>
          <Typography variant="h5" component="span" fontWeight="bold">
            {totalAmount.toFixed(2)}
          </Typography>
          <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 0.5 }}>
            RON
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">De: {userName}</Typography>
          <Typography variant="body2" color="text.secondary">La: {formatTime(createdAt)}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

ReceiptCard.propTypes = {
  receipt: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    totalAmount: PropTypes.number,
    userName: PropTypes.string,
    tableName: PropTypes.string,
    createdAt: PropTypes.string, // Presupunem că este un string ISO
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ReceiptCard;