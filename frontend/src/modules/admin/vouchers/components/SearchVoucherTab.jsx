import React from 'react';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import BlockIcon from '@mui/icons-material/Block';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';
import dayjs from 'dayjs';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dayjs(value).format('DD.MM.YYYY HH:mm');
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dayjs(value).format('DD.MM.YYYY');
};

const getDiscountLabel = (type, value) => {
  if (value === null || value === undefined) return '-';
  if (type === 'PERCENT') return `${Number(value).toFixed(2)}%`;
  if (type === 'FREE_HOURS') return `${Number(value)} ore`;
  return `${Number(value).toFixed(2)} lei`;
};

const getStatusLabel = (status) => {
  if (status === 'USED') return 'Utilizat';
  if (status === 'ANNULLED') return 'Anulat';
  if (status === 'EXPIRED') return 'Expirat';
  return 'Activ';
};

const getStatusColor = (status) => {
  if (status === 'USED') return 'default';
  if (status === 'ANNULLED') return 'error';
  if (status === 'EXPIRED') return 'warning';
  return 'success';
};

const SearchVoucherTab = ({
  activePrefixes,
  searchPrefix,
  onSearchPrefixChange,
  searchCode,
  onSearchCodeChange,
  searchLoading,
  onValidate,
  searchResult,
  saving,
  onReactivateByCode,
  onDeactivateByCode,
}) => {
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={600}>
            Verificare cod voucher
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              select
              label="Campanie (prefix)"
              value={searchPrefix}
              onChange={(e) => onSearchPrefixChange(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">
                Selecteaza campania
              </MenuItem>
              {activePrefixes.map((prefix) => (
                <MenuItem key={prefix} value={prefix}>
                  {prefix}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Cod voucher (4 caractere)"
              value={searchCode}
              onChange={(e) => onSearchCodeChange(e.target.value.toUpperCase())}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              onClick={onValidate}
              disabled={searchLoading}
            >
              {searchLoading ? 'Verific...' : 'Verifica'}
            </Button>
          </Stack>
          {searchResult && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Chip label={searchResult.code} />
              <Chip label={getDiscountLabel(searchResult.discountType, searchResult.discountValue)} />
              <Chip label={`Emis: ${formatDateTime(searchResult.createdAt)}`} />
              {searchResult.usedAt && (
                <Chip label={`${searchResult.status === 'ANNULLED' ? 'Anulat la' : 'Utilizat'}: ${formatDateTime(searchResult.usedAt)}`} />
              )}
              <Chip label={`Expira: ${formatDate(searchResult.expiresAt)}`} />
              <Chip
                color={getStatusColor(searchResult.status)}
                label={getStatusLabel(searchResult.status)}
              />
              {searchResult.errorCode && !['USED', 'ANNULLED', 'EXPIRED'].includes(searchResult.status) && (
                <Chip color="warning" label={getFriendlyErrorMessage(searchResult.errorCode)} />
              )}
              {(searchResult.status === 'USED' || searchResult.status === 'ANNULLED') && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RestoreIcon />}
                  onClick={() => onReactivateByCode(searchResult.code)}
                  disabled={saving}
                >
                  Reactivează
                </Button>
              )}
              {searchResult.status === 'AVAILABLE' && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<BlockIcon />}
                  onClick={() => onDeactivateByCode(searchResult.code)}
                  disabled={saving}
                >
                  Dezactivează
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </Paper>
    </>
  );
};

export default SearchVoucherTab;
