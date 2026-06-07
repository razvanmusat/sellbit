import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptIcon from '@mui/icons-material/Receipt';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { SalesService } from '../../../admin/sales/api/SalesService';
import ReceiptDetailModal from '../../../admin/sales/components/ReceiptDetailModal';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = dayjs(value);
  if (!date.isValid()) return value;
  return date.format('DD.MM.YYYY HH:mm');
};

const getDiscountLabel = (type, value) => {
  if (value === null || value === undefined) return '-';
  if (type === 'PERCENT') return `${Number(value).toFixed(2)}%`;
  if (type === 'FREE_HOURS') return `${Number(value)} ore`;
  return `${Number(value).toFixed(2)} lei`;
};

const ExpiredTab = ({ vouchersLoading, vouchers }) => {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);

  const handleOpenReceipt = async (receiptId) => {
    if (!receiptId || loadingReceiptId) return;
    setLoadingReceiptId(receiptId);
    try {
      const data = await SalesService.getReceiptById(receiptId);
      setSelectedReceipt(data);
      setReceiptModalOpen(true);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const groupedByDay = useMemo(() => {
    if (!vouchers.length) return [];

    const groups = {};
    vouchers.forEach((voucher) => {
      const expDate = voucher.expiresAt ? new Date(voucher.expiresAt) : null;
      const dayKey = expDate ? dayjs(expDate).format('YYYY-MM-DD') : 'fara-data';
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(voucher);
    });

    return Object.entries(groups)
      .map(([date, items]) => ({
        date,
        displayDate: date === 'fara-data' ? 'Fără dată' : dayjs(date).locale('ro').format('DD MMMM YYYY'),
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
          Nu exista vouchere expirate in aceasta perioada.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Stack spacing={1}>
        {groupedByDay.map((dayGroup) => (
          <Accordion
            key={dayGroup.date}
            disableGutters
            sx={{ mb: 1, border: '1px solid #ffe0b2', borderRadius: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fff8e1' }}>
              <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" mr={2}>
                <Typography fontWeight="bold">{dayGroup.displayDate}</Typography>
                <Chip label={`${dayGroup.voucherCount} vouchere`} color="warning" size="small" />
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 1, bgcolor: '#fafafa' }}>
              <Stack spacing={0.5}>
                {dayGroup.vouchers.map((voucher) => (
                  <Paper key={voucher.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={600}>{voucher.code}</Typography>
                      <Chip size="small" label={voucher.campaignName || 'Campanie'} />
                      <Chip size="small" label={getDiscountLabel(voucher.discountType, voucher.discountValue)} />
                      <Chip size="small" label={`Emis: ${formatDateTime(voucher.createdAt)}`} />
                      {voucher.issuedReceiptId && (
                        <Chip
                          size="small"
                          icon={loadingReceiptId === voucher.issuedReceiptId ? <CircularProgress size={12} /> : <ReceiptIcon />}
                          label={`Bon #${voucher.issuedReceiptId}`}
                          onClick={() => handleOpenReceipt(voucher.issuedReceiptId)}
                          color="primary"
                          variant="outlined"
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                      <Chip size="small" label={`Expirat la: ${formatDateTime(voucher.expiresAt)}`} />
                      <Chip size="small" color="warning" label="Expirat" />
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <ReceiptDetailModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={selectedReceipt}
      />
    </>
  );
};

export default ExpiredTab;
