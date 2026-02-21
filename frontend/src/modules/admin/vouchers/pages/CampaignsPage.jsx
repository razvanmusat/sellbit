import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditIcon from '@mui/icons-material/Edit';

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

const CampaignsPage = ({
  campaignsLoading,
  sortedCampaigns,
  saving,
  onCreateCampaign,
  onEditCampaign,
  onToggleCampaign,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateCampaign}
          disabled={saving}
        >
          Campanie noua
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Campaniile active emit automat vouchere la bonurile eligibile. Doar una cu acelasi prefix poate fi activa.
      </Alert>

      {campaignsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.2}>
          {sortedCampaigns.map((campaign) => (
            <Paper key={campaign.id} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1" fontWeight={600}>
                      {campaign.name}
                    </Typography>
                    <Chip
                      size="small"
                      color={campaign.active ? 'success' : 'default'}
                      label={campaign.active ? 'Activa' : 'Inactiva'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(campaign.validFromDate)} - {formatDate(campaign.validUntilDate)}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={getDiscountLabel(campaign.discountType, campaign.discountValue)} />
                    {campaign.applicableDays && (
                      <Chip size="small" label={`Zile: ${campaign.applicableDays}`} />
                    )}
                    {campaign.requiredProductId && (
                      <Chip
                        size="small"
                        label={`Produs necesar: ${campaign.requiredProductName || `#${campaign.requiredProductId}`}`}
                      />
                    )}
                    {campaign.applicableProductId && (
                      <Chip
                        size="small"
                        label={`Produs aplicabil: ${campaign.applicableProductName || `#${campaign.applicableProductId}`}`}
                      />
                    )}
                  </Stack>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => onEditCampaign(campaign)}
                    disabled={saving}
                  >
                    Editeaza
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => onToggleCampaign(campaign)}
                    disabled={saving}
                  >
                    {campaign.active ? 'Dezactiveaza' : 'Activeaza'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {!sortedCampaigns.length && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nu exista campanii inregistrate.
              </Typography>
            </Paper>
          )}
        </Stack>
      )}
    </>
  );
};

export default CampaignsPage;
