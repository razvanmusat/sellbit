import React from 'react';
import {
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import AvailableTab from '../components/AvailableTab';
import UsedTab from '../components/UsedTab';
import AnnulledTab from '../components/AnnulledTab';
import ExpiredTab from '../components/ExpiredTab';
import SearchVoucherTab from '../components/SearchVoucherTab';

const EmitedVouchersPage = ({
  voucherFilter,
  onFilterChange,
  vouchersLoading,
  vouchers,
  saving,
  activePrefixes,
  searchPrefix,
  onSearchPrefixChange,
  searchCode,
  onSearchCodeChange,
  searchLoading,
  onValidate,
  searchResult,
  onReactivate,
  onReactivateByCode,
  onDeactivateByCode,
  fromDate,
  toDate,
  onDateChange,
  getDefaultDateRange,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <>
        <Tabs
          value={voucherFilter || false}
          onChange={(_, value) => onFilterChange(value)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Active" value="available" />
          <Tab label="Utilizate" value="used" />
          <Tab label="Anulate" value="annulled" />
          <Tab label="Expirate" value="expired" />
          <Tab label="Caută cod" value="search" />
        </Tabs>

        {/* Date Filter - below tabs, only for Active, Utilizate, Anulate and Expirate */}
        {voucherFilter !== 'search' && voucherFilter && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <DatePicker
                label="De la"
                format="DD/MM/YYYY"
                value={fromDate ? dayjs(fromDate) : null}
                onChange={(value) => onDateChange(value ? value.format('YYYY-MM-DD') : '', toDate)}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="Până la"
                format="DD/MM/YYYY"
                value={toDate ? dayjs(toDate) : null}
                onChange={(value) => onDateChange(fromDate, value ? value.format('YYYY-MM-DD') : '')}
                slotProps={{ textField: { size: 'small' } }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const defaults = getDefaultDateRange();
                  onDateChange(defaults.fromDate, defaults.toDate);
                }}
              >
                Reset (Luna curentă)
              </Button>
              {voucherFilter === 'expired' && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                  Vouchere expirate în perioada selectată:{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {vouchers.length}
                  </Box>
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* No filter selected message */}
        {!voucherFilter && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '400px'
          }}>
            <Typography variant="h6" color="textSecondary">
              Selectează o opțiune de mai sus
            </Typography>
          </Box>
        )}

        {voucherFilter === 'available' && (
          <AvailableTab
            vouchersLoading={vouchersLoading}
            vouchers={vouchers}
            saving={saving}
            onDeactivate={onDeactivateByCode}
          />
        )}

        {voucherFilter === 'used' && (
          <UsedTab
            vouchersLoading={vouchersLoading}
            vouchers={vouchers}
            saving={saving}
            onReactivate={onReactivate}
          />
        )}

        {voucherFilter === 'annulled' && (
          <AnnulledTab
            vouchersLoading={vouchersLoading}
            vouchers={vouchers}
            saving={saving}
            onReactivate={onReactivate}
          />
        )}

        {voucherFilter === 'expired' && (
          <ExpiredTab
            vouchersLoading={vouchersLoading}
            vouchers={vouchers}
          />
        )}

        {voucherFilter === 'search' && (
          <SearchVoucherTab
            activePrefixes={activePrefixes}
            searchPrefix={searchPrefix}
            onSearchPrefixChange={onSearchPrefixChange}
            searchCode={searchCode}
            onSearchCodeChange={onSearchCodeChange}
            searchLoading={searchLoading}
            onValidate={onValidate}
            searchResult={searchResult}
            saving={saving}
            onReactivateByCode={onReactivateByCode}
            onDeactivateByCode={onDeactivateByCode}
          />
        )}
      </>
    </LocalizationProvider>
  );
};

export default EmitedVouchersPage;
