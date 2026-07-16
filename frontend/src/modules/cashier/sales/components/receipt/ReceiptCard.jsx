import React from 'react';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';

// Helper pentru a formata ora dintr-un string ISO (ex: "2024-01-25T10:30:00")
const formatTime = (isoString) => {
  if (!isoString) {
    return 'N/A';
  }
  try {
    return dayjs(isoString).format('HH:mm');
  } catch {
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
    statusCode,
  } = receipt;
  const isFiscalPending = statusCode === 'FISCAL_PENDING';

  return (
    <Card
      onClick={() => {
        if (!isFiscalPending) onClick(receipt.id);
      }}
      sx={{
        width: { xs: '100%', sm: 220 },
        cursor: isFiscalPending ? 'not-allowed' : 'pointer',
        border: isFiscalPending ? '1px solid' : undefined,
        borderColor: isFiscalPending ? 'warning.main' : undefined,
        bgcolor: isFiscalPending ? 'warning.50' : 'background.paper',
        opacity: isFiscalPending ? 0.88 : 1,
        '&:hover': isFiscalPending ? {} : { boxShadow: 6, transform: 'translateY(-2px)' },
        transition: 'all 0.2s',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h6" component="div" fontWeight="bold" noWrap>
            {tableName}
          </Typography>
          {isFiscalPending && (
            <Chip
              icon={<HourglassTopIcon />}
              label="Fiscal"
              color="warning"
              size="small"
              sx={{ flexShrink: 0 }}
            />
          )}
        </Box>

        {isFiscalPending && (
          <Typography variant="caption" color="warning.dark" sx={{ display: 'block', mt: 0.5 }}>
            In asteptare casa
          </Typography>
        )}

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
    createdAt: PropTypes.string,
    statusCode: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ReceiptCard;
