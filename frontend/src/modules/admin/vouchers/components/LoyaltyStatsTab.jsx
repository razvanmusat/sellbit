import React, { useEffect, useState } from 'react';
import {
  Box, CircularProgress, Paper, Stack, Typography,
  Chip, Collapse, IconButton, Table, TableBody,
  TableCell, TableHead, TableRow, Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import dayjs from 'dayjs';
import { VoucherCampaignService } from '../api/VoucherCampaignService';

const LoyaltyStatsTab = ({ campaigns }) => {
  const loyaltyCampaigns = (campaigns || []).filter((c) => c.campaignType === 'LOYALTY');
  const [stats, setStats] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loyaltyCampaigns.length) return;
    loyaltyCampaigns.forEach((c) => {
      setLoading((prev) => ({ ...prev, [c.id]: true }));
      VoucherCampaignService.getLoyaltyStats(c.id)
        .then((data) => setStats((prev) => ({ ...prev, [c.id]: data })))
        .catch(() => setError('Nu s-au putut incarca statisticile.'))
        .finally(() => setLoading((prev) => ({ ...prev, [c.id]: false })));
    });
  }, [campaigns]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!loyaltyCampaigns.length) {
    return (
      <Alert severity="info">
        Nu exista campanii de tip Fidelitate configurate.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {loyaltyCampaigns.map((c) => {
        const s = stats[c.id];
        const isLoading = loading[c.id];
        const isExpanded = expanded[c.id];

        return (
          <Paper key={c.id} variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>{c.name}</Typography>
                  <Chip
                    size="small"
                    color={c.active ? 'success' : 'default'}
                    label={c.active ? 'Activa' : 'Inactiva'}
                  />
                </Stack>
              </Box>

              {isLoading ? (
                <CircularProgress size={24} />
              ) : s ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">{s.vouchersIssued}</Typography>
                    <Typography variant="caption" color="text.secondary">vouchere emise</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">{s.vouchersUsed}</Typography>
                    <Typography variant="caption" color="text.secondary">vouchere folosite</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="secondary">{s.stampsGiven}</Typography>
                    <Typography variant="caption" color="text.secondary">stampile date</Typography>
                  </Box>
                  {(() => {
                    const stampsRequired = c.stampsRequired || 1;
                    const minStampsExpected = s.vouchersUsed * stampsRequired;
                    const fraud = s.stampsGiven < minStampsExpected;
                    return fraud ? (
                      <Chip
                        label={`FRAUDA: -${minStampsExpected - s.stampsGiven} stampile`}
                        color="error"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    ) : (
                      <Chip label="OK" color="success" size="small" />
                    );
                  })()}
                  <IconButton size="small" onClick={() => toggleExpand(c.id)}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Stack>
              ) : null}
            </Box>

            <Collapse in={isExpanded}>
              {s?.stampHistory?.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Istoric stampile ({s.stampHistory.length})
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Nr. Bon</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Casier</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Data/Ora</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {s.stampHistory.map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {entry.receiptId ? `#${entry.receiptId}` : '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{entry.cashierName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {entry.givenAt ? dayjs(entry.givenAt).format('DD.MM.YYYY HH:mm') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Nu exista stampile inregistrate.
                </Typography>
              )}
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default LoyaltyStatsTab;
