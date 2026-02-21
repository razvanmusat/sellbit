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
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ro-RO');
};

const getDiscountLabel = (type, value) => {
  if (value === null || value === undefined) return '-';
  if (type === 'PERCENT') return `${Number(value).toFixed(2)}%`;
  if (type === 'FREE_HOURS') return `${Number(value)} ore`;
  return `${Number(value).toFixed(2)} lei`;
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
              <Chip label={`Expira: ${formatDateTime(searchResult.expiresAt)}`} />
              <Chip
                color={searchResult.isValid ? 'success' : 'default'}
                label={searchResult.isValid ? 'Valid' : 'Invalid'}
              />
              {searchResult.errorCode && (
                <Chip color="warning" label={getFriendlyErrorMessage(searchResult.errorCode)} />
              )}
              {searchResult.errorCode?.includes('ALREADY_USED') && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RestoreIcon />}
                  onClick={() => onReactivateByCode(searchResult.code)}
                  disabled={saving}
                >
                  Reactiveaza
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
