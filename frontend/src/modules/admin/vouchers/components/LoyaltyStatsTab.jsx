import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, CircularProgress, Stack, Typography,
  Chip, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, Button, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import { VoucherCampaignService } from '../api/VoucherCampaignService';
import { SalesService } from '../../../admin/sales/api/SalesService';
import ReceiptDetailModal from '../../../admin/sales/components/ReceiptDetailModal';

const calcDefaultFrom = (campaign) => {
  const byValidDays = dayjs().subtract(campaign.validDays || 30, 'day');
  const campaignStart = campaign.validFromDate ? dayjs(campaign.validFromDate) : byValidDays;
  return (byValidDays.isAfter(campaignStart) ? byValidDays : campaignStart).format('YYYY-MM-DD');
};

const calcDefaultTo = () => dayjs().format('YYYY-MM-DD');

function groupByDay(stampHistory) {
  if (!stampHistory?.length) return [];
  const groups = {};
  stampHistory.forEach((entry) => {
    const dayKey = entry.givenAt ? dayjs(entry.givenAt).format('YYYY-MM-DD') : 'fara-data';
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(entry);
  });
  return Object.entries(groups)
    .map(([date, entries]) => ({
      date,
      displayDate: date === 'fara-data' ? 'Fără dată' : dayjs(date).locale('ro').format('DD MMMM YYYY'),
      entries,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Sub-component per campanie — hooks apelate la nivel corect
const CampaignCard = ({ campaign, stats, allTimeStats, isLoading, range, onDateChange, onReset, onOpenReceipt, loadingReceiptId }) => {
  const s = stats;
  const c = campaign;

  const days = useMemo(() => groupByDay(s?.stampHistory), [s?.stampHistory]);

  // Fraud se calculează pe toată campania (all-time), nu pe perioada filtrată
  const stampsRequired = c.stampsRequired || 1;
  const minStampsExpected = (allTimeStats?.vouchersUsed || 0) * stampsRequired;
  const hasFraud = allTimeStats && allTimeStats.stampsGiven < minStampsExpected;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={700}>{c.name}</Typography>
          <Chip size="small" color={c.active ? 'success' : 'default'} label={c.active ? 'Activa' : 'Inactiva'} />
          {c.validFromDate && c.validUntilDate && (
            <Typography variant="body2" color="text.secondary">
              Valabilitate: {dayjs(c.validFromDate).format('DD.MM.YYYY')} – {dayjs(c.validUntilDate).format('DD.MM.YYYY')}
            </Typography>
          )}
          {isLoading && <CircularProgress size={16} thickness={5} />}
        </Stack>

        {allTimeStats && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" lineHeight={1}>{allTimeStats.vouchersIssued}</Typography>
              <Typography variant="caption" color="text.secondary">emise</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main" lineHeight={1}>{allTimeStats.vouchersUsed}</Typography>
              <Typography variant="caption" color="text.secondary">folosite</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="secondary.main" lineHeight={1}>{allTimeStats.stampsGiven}</Typography>
              <Typography variant="caption" color="text.secondary">stampile</Typography>
            </Box>
            {hasFraud ? (
              <Chip label={`FRAUDA: -${minStampsExpected - allTimeStats.stampsGiven} stampile`} color="error" size="small" sx={{ fontWeight: 'bold' }} />
            ) : (
              <Chip label="OK" color="success" size="small" />
            )}
          </Stack>
        )}
      </Box>

      {/* Filtre dată */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }}>
        <DatePicker
          label="De la"
          format="DD/MM/YYYY"
          value={range.fromDate ? dayjs(range.fromDate) : null}
          onChange={(val) => onDateChange(c.id, 'fromDate', val ? val.format('YYYY-MM-DD') : null)}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="Până la"
          format="DD/MM/YYYY"
          value={range.toDate ? dayjs(range.toDate) : null}
          onChange={(val) => onDateChange(c.id, 'toDate', val ? val.format('YYYY-MM-DD') : null)}
          slotProps={{ textField: { size: 'small' } }}
        />
        <Button size="small" variant="outlined" onClick={() => onReset(c)}>
          Ultimele {c.validDays || 30} zile
        </Button>
      </Stack>

      {/* Conținut */}
      {!s && isLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">Se încarcă...</Typography>
        </Box>
      ) : s ? (
        <Box sx={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {!days.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              Nu exista stampile in aceasta perioada.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {days.map((dayGroup) => (
                <Accordion key={dayGroup.date} disableGutters sx={{ border: '1px solid #ce93d8', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f3e5f5' }}>
                    <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" mr={1}>
                      <Typography fontWeight={600} variant="body2">{dayGroup.displayDate}</Typography>
                      <Chip label={`${dayGroup.entries.length} stampile`} size="small" color="secondary" />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#fafafa' }}>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Ora</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Nr. Bon</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Casier</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dayGroup.entries.map((entry) => (
                          <TableRow key={entry.id} hover>
                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              {entry.givenAt ? dayjs(entry.givenAt).format('HH:mm') : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {entry.receiptId ? (
                                <Box
                                  component="span"
                                  onClick={() => onOpenReceipt(entry.receiptId)}
                                  sx={{
                                    fontWeight: 600,
                                    color: 'primary.main',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    '&:hover': { color: 'primary.dark' },
                                  }}
                                >
                                  {loadingReceiptId === entry.receiptId
                                    ? <CircularProgress size={12} sx={{ ml: 0.5 }} />
                                    : `#${entry.receiptId}`}
                                </Box>
                              ) : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {entry.cashierName
                                ? <>{entry.cashierName} <Typography component="span" variant="caption" color="text.secondary">(a aplicat ștampila)</Typography></>
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

const LoyaltyStatsTab = ({ campaigns }) => {
  const loyaltyCampaigns = useMemo(
    () => (campaigns || []).filter((c) => c.campaignType === 'LOYALTY'),
    [campaigns]
  );

  const [dateRanges, setDateRanges] = useState({});
  const [stats, setStats] = useState({});
  const [allTimeStats, setAllTimeStats] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);

  const fetchStats = useCallback((campaignId, fromDate, toDate) => {
    setLoading((prev) => ({ ...prev, [campaignId]: true }));
    VoucherCampaignService.getLoyaltyStats(campaignId, fromDate, toDate)
      .then((data) => setStats((prev) => ({ ...prev, [campaignId]: data })))
      .catch(() => setError('Nu s-au putut incarca statisticile.'))
      .finally(() => setLoading((prev) => ({ ...prev, [campaignId]: false })));
  }, []);

  const handleOpenReceipt = useCallback(async (receiptId) => {
    if (!receiptId || loadingReceiptId) return;
    setLoadingReceiptId(receiptId);
    try {
      const data = await SalesService.getReceiptById(receiptId);
      setSelectedReceipt(data);
      setReceiptModalOpen(true);
    } finally {
      setLoadingReceiptId(null);
    }
  }, [loadingReceiptId]);

  // String stabil din ID-uri — efectul nu se declanșează la re-render-uri cu referință nouă dar date identice
  const campaignIdKey = loyaltyCampaigns.map((c) => c.id).join(',');

  useEffect(() => {
    if (!loyaltyCampaigns.length) return;
    loyaltyCampaigns.forEach((c) => {
      setDateRanges((prev) => {
        if (prev[c.id]) return prev;
        return { ...prev, [c.id]: { fromDate: calcDefaultFrom(c), toDate: calcDefaultTo() } };
      });
      if (!stats[c.id]) {
        fetchStats(c.id, calcDefaultFrom(c), calcDefaultTo());
      }
      if (!allTimeStats[c.id]) {
        VoucherCampaignService.getLoyaltyStats(c.id)
          .then((data) => setAllTimeStats((p) => ({ ...p, [c.id]: data })))
          .catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignIdKey]);

  const handleDateChange = (campaignId, field, value) => {
    const newRange = { ...dateRanges[campaignId], [field]: value };
    setDateRanges((prev) => ({ ...prev, [campaignId]: newRange }));
    if (newRange.fromDate && newRange.toDate) {
      fetchStats(campaignId, newRange.fromDate, newRange.toDate);
    }
  };

  const handleReset = useCallback((campaign) => {
    const fromDate = calcDefaultFrom(campaign);
    const toDate = calcDefaultTo();
    setDateRanges((prev) => ({ ...prev, [campaign.id]: { fromDate, toDate } }));
    fetchStats(campaign.id, fromDate, toDate);
  }, [fetchStats]);

  if (!loyaltyCampaigns.length) {
    return <Alert severity="info">Nu exista campanii de tip Fidelitate configurate.</Alert>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Stack spacing={3} divider={<Divider />}>
        {error && <Alert severity="error">{error}</Alert>}

        {loyaltyCampaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            stats={stats[c.id]}
            allTimeStats={allTimeStats[c.id]}
            isLoading={!!loading[c.id]}
            range={dateRanges[c.id] || {}}
            onDateChange={handleDateChange}
            onReset={handleReset}
            onOpenReceipt={handleOpenReceipt}
            loadingReceiptId={loadingReceiptId}
          />
        ))}
      </Stack>

      <ReceiptDetailModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={selectedReceipt}
      />
    </LocalizationProvider>
  );
};

export default LoyaltyStatsTab;
