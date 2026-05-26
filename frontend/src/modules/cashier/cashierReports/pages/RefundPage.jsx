import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetCache } from '../store/cashMovementHistorySlice';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Button,
  CircularProgress, Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro';
import dayjs from 'dayjs';

import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PersonIcon from '@mui/icons-material/Person';
import PrintIcon from '@mui/icons-material/Print';

import RefundModal from '../components/RefundModal';
import { useRefundPage } from '../hooks/useRefundPage';
import { VoucherCampaignService } from '../../../admin/vouchers/api/VoucherCampaignService';
import {
  printVoucherPages,
  buildGiftCardBody,
  buildRegularVoucherBody,
  buildLoyaltyCardBody
} from '../../../../shared/utils/printVoucher';

const buildVoucherBody = (v) => {
  if (v.campaignType === 'GIFT_CARD') {
    return buildGiftCardBody({ code: v.code, discountValue: v.discountValue, expiresAt: v.expiresAt, receiptTemplate: v.receiptTemplate });
  }
  if (v.campaignType === 'LOYALTY') {
    return buildLoyaltyCardBody({ code: v.code, stampsRequired: v.stampsRequired, discountType: v.discountType, discountValue: v.discountValue, expiresAt: v.expiresAt, receiptTemplate: v.receiptTemplate });
  }
  return buildRegularVoucherBody({ code: v.code, discountType: v.discountType, discountValue: v.discountValue, expiresAt: v.expiresAt, receiptTemplate: v.receiptTemplate });
};

const RefundPage = () => {
  const { warehouses } = useOutletContext() || { warehouses: [] };
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlRefundDate = searchParams.get('refundDate');
  const [selectedDate, setSelectedDate] = useState(
    urlRefundDate ? dayjs(urlRefundDate) : dayjs()
  );

  // Sincronizare URL -> state (la refresh)
  useEffect(() => {
    if (!urlRefundDate) {
      const current = Object.fromEntries(searchParams);
      setSearchParams({ ...current, refundDate: dayjs().format('YYYY-MM-DD') }, { replace: true });
    } else {
      const urlDayjs = dayjs(urlRefundDate);
      if (urlDayjs.isValid() && (!selectedDate || !selectedDate.isSame(urlDayjs, 'day'))) {
        setSelectedDate(urlDayjs);
      }
    }
  }, [urlRefundDate]);

  // Sincronizare state -> URL
  useEffect(() => {
    if (!selectedDate) return;
    const formatted = selectedDate.format('YYYY-MM-DD');
    if (searchParams.get('refundDate') !== formatted) {
      const current = Object.fromEntries(searchParams);
      setSearchParams({ ...current, refundDate: formatted }, { replace: true });
    }
  }, [selectedDate]);

  const {
    receipts,
    loading,
    error,
    modalOpen,
    selectedReceipt,
    handleOpenModal,
    handleCloseModal,
    handleRefundSuccess: originalHandleRefundSuccess
  } = useRefundPage(warehouses, selectedDate?.format('YYYY-MM-DD'));

  const handleRefundSuccess = useCallback(() => {
    dispatch(resetCache());
    if (originalHandleRefundSuccess) originalHandleRefundSuccess();
  }, [dispatch, originalHandleRefundSuccess]);

  const [reprintingId, setReprintingId] = useState(null);

  const handleReprintVouchers = async (receiptId) => {
    setReprintingId(receiptId);
    try {
      const vouchers = await VoucherCampaignService.getIssuedByReceipt(receiptId);
      if (vouchers?.length) {
        await printVoucherPages(vouchers.map(buildVoucherBody));
      }
    } catch {
      // silent
    } finally {
      setReprintingId(null);
    }
  };

  const compactCellStyle = { padding: '4px 8px', width: '1%', whiteSpace: 'nowrap' };
  const fluidCellStyle = { padding: '4px 8px', width: 'auto' };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ p: { xs: 1, sm: 2 } }}>

        {/* FILTRE — doar data, fără selector gestiune */}
        <Paper
          elevation={0}
          sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mr: 1 }}>
              <AssignmentReturnIcon color="action" />
              <Typography variant="subtitle2"
                sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}>
                Retururi din data:
              </Typography>
            </Box>

            <DatePicker
              label="Selectează Ziua"
              value={selectedDate}
              onChange={(newValue) => newValue && setSelectedDate(newValue)}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { bgcolor: 'white', width: 180 }
                }
              }}
            />

            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>
        </Paper>

        {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && receipts.length === 0 && selectedDate && (
          <Alert severity="warning">
            Nu există bonuri închise în data de {selectedDate.format('DD/MM/YYYY')}.
          </Alert>
        )}

        {/* TABEL REZULTATE */}
        {receipts.length > 0 && (
          <TableContainer component={Paper} elevation={1} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#eeeeee' }}>
                <TableRow>
                  <TableCell align="center" sx={compactCellStyle}>Data & Ora</TableCell>
                  <TableCell align="right" sx={compactCellStyle}>Sumă</TableCell>
                  <TableCell align="left" sx={fluidCellStyle}>Explicație</TableCell>
                  <TableCell align="left" sx={fluidCellStyle}>Notițe</TableCell>
                  <TableCell align="center" sx={compactCellStyle}>Acțiuni</TableCell>
                  <TableCell align="center" sx={compactCellStyle}>Utilizator</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipts.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell align="center" sx={compactCellStyle}>
                      {row.closedAt ? dayjs(row.closedAt).format('DD/MM/YYYY HH:mm') : '-'}
                    </TableCell>

                    <TableCell align="right" sx={compactCellStyle}>
                      <Typography fontWeight="bold" color="success.main" variant="body2">
                        {typeof row.totalAmount === 'number'
                          ? row.totalAmount.toFixed(2)
                          : row.totalAmount} RON
                      </Typography>
                    </TableCell>

                    <TableCell align="left" sx={fluidCellStyle}>
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                        Bon nr. {row.id} {row.tableName || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell align="left"
                      sx={{ ...fluidCellStyle, color: 'text.secondary', fontStyle: 'italic' }}>
                      {row.note || '-'}
                    </TableCell>

                    <TableCell align="center" sx={compactCellStyle}>
                      <Box display="flex" gap={1} justifyContent="center">
                        <Button
                          variant="outlined" size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenModal(row)}
                          sx={{ textTransform: 'none', py: 0 }}
                        >
                          Vizualizează
                        </Button>
                        <Button
                          variant="outlined" size="small" color="secondary"
                          startIcon={reprintingId === row.id ? <CircularProgress size={14} /> : <PrintIcon />}
                          onClick={() => handleReprintVouchers(row.id)}
                          disabled={reprintingId === row.id}
                          sx={{ textTransform: 'none', py: 0, visibility: row.hasVouchers ? 'visible' : 'hidden' }}
                        >
                          Voucher
                        </Button>
                      </Box>
                    </TableCell>

                    <TableCell align="left" sx={compactCellStyle}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <PersonIcon fontSize="small" color="disabled" />
                        <Typography variant="body2">{row.userName}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <RefundModal
          open={modalOpen}
          onClose={handleCloseModal}
          receipt={selectedReceipt}
          onRefundSuccess={handleRefundSuccess}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default RefundPage;