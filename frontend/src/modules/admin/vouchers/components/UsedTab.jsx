import React, { useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ro-RO');
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ro-RO');
};

const getDiscountLabel = (type, value) => {
  if (value === null || value === undefined) return '-';
  if (type === 'PERCENT') return `${Number(value).toFixed(2)}%`;
  if (type === 'FREE_HOURS') return `${Number(value)} ore`;
  return `${Number(value).toFixed(2)} lei`;
};

const UsedTab = ({
  vouchersLoading,
  vouchers,
  saving,
  onReactivate,
}) => {
  // Grupez vouchere pe zile de consum
  const groupedByDay = useMemo(() => {
    if (!vouchers.length) return [];
    
    const groups = {};
    vouchers.forEach((voucher) => {
      const usedDate = voucher.usedAt ? new Date(voucher.usedAt) : null;
      const dayKey = usedDate
        ? dayjs(usedDate).format('YYYY-MM-DD')
        : 'fara-data';
      
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(voucher);
    });

    return Object.entries(groups)
      .map(([date, items]) => ({
        date,
        displayDate: date === 'fara-data' ? 'Fără dată' : dayjs(date).format('DD MMMM YYYY'),
        voucherCount: items.length,
        vouchers: items,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [vouchers]);

  if (vouchersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!groupedByDay.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Nu exista vouchere utilizate.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1}>
      {groupedByDay.map((dayGroup) => (
        <Accordion
          key={dayGroup.date}
          disableGutters
          sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'warning.50' }}>
            <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" mr={2}>
              <Typography fontWeight="bold">
                {dayGroup.displayDate}
              </Typography>
              <Chip
                label={`${dayGroup.voucherCount} vouchere`}
                color="warning"
                size="small"
              />
            </Stack>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 1, bgcolor: '#fafafa' }}>
            <Stack spacing={1}>
              {dayGroup.vouchers.map((voucher) => (
                <Paper key={voucher.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2" fontWeight={600}>
                          {voucher.code}
                        </Typography>
                        <Chip size="small" label={voucher.campaignName || 'Campanie'} />
                        <Chip size="small" color="default" label="Utilizat" />
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip size="small" label={getDiscountLabel(voucher.discountType, voucher.discountValue)} />
                        <Chip size="small" label={`Expira: ${formatDate(voucher.expiresAt)}`} />
                      </Stack>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RestoreIcon />}
                      onClick={() => onReactivate(voucher)}
                      disabled={saving}
                    >
                      Reactiveaza
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
};

export default UsedTab;
