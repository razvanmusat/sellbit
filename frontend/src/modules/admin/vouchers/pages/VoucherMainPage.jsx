import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useVoucherMainPage } from '../hooks/useVoucherMainPage';
import VoucherCampaignFormDialog from '../components/VoucherCampaignFormDialog';
import CampaignsPage from './CampaignsPage';
import EmitedVouchersPage from './EmitedVouchersPage';

const VoucherMainPage = () => {
  const {
    activeTab,
    setActiveTab,
    campaignsLoading,
    vouchersLoading,
    sortedCampaigns,
    vouchers,
    voucherFilter,
    setVoucherFilter,
    saving,
    openCampaignDialog,
    campaignForm,
    activePrefixes,
    snackbar,
    confirmDialog,
    refreshCampaigns,
    openCreateCampaign,
    openEditCampaign,
    closeCampaignDialog,
    setCampaignField,
    saveCampaign,
    requestToggleCampaign,
    requestReactivateVoucher,
    closeConfirmDialog,
    confirmAction,
    closeSnackbar,
    searchPrefix,
    setSearchPrefix,
    searchCode,
    setSearchCode,
    searchResult,
    searchLoading,
    validateVoucherCode,
    requestReactivateVoucherByCode,
    fromDate,
    toDate,
    updateDateRange,
    getDefaultDateRange,
  } = useVoucherMainPage();

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">Vouchere & Campanii</Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab label="Campanii" value="campaigns" />
        <Tab label="Vouchere emise" value="vouchers" />
      </Tabs>

      {activeTab === 'campaigns' && (
        <CampaignsPage
          campaignsLoading={campaignsLoading}
          sortedCampaigns={sortedCampaigns}
          saving={saving}
          onCreateCampaign={openCreateCampaign}
          onEditCampaign={openEditCampaign}
          onToggleCampaign={requestToggleCampaign}
        />
      )}

      {activeTab === 'vouchers' && (
        <EmitedVouchersPage
          voucherFilter={voucherFilter}
          onFilterChange={setVoucherFilter}
          vouchersLoading={vouchersLoading}
          vouchers={vouchers}
          saving={saving}
          activePrefixes={activePrefixes}
          searchPrefix={searchPrefix}
          onSearchPrefixChange={setSearchPrefix}
          searchCode={searchCode}
          onSearchCodeChange={setSearchCode}
          searchLoading={searchLoading}
          onValidate={validateVoucherCode}
          searchResult={searchResult}
          onReactivate={requestReactivateVoucher}
          onReactivateByCode={requestReactivateVoucherByCode}
          fromDate={fromDate}
          toDate={toDate}
          onDateChange={updateDateRange}
          getDefaultDateRange={getDefaultDateRange}
        />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirmare actiune</DialogTitle>
        <DialogContent>
          <Typography>
            {(confirmDialog.type === 'reactivate-voucher' || confirmDialog.type === 'reactivate-voucher-code') && (
              <>Reactivare voucherul {confirmDialog.payload?.code}?</>
            )}
            {(confirmDialog.type === 'deactivate-campaign' || confirmDialog.type === 'activate-campaign') && (
              <>Schimbi statusul campaniei {confirmDialog.payload?.name}?</>
            )}
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="inherit" disabled={saving}>Anuleaza</Button>
          <Button onClick={confirmAction} variant="contained" disabled={saving}>
            Confirma
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Form Dialog */}
      <VoucherCampaignFormDialog
        open={openCampaignDialog}
        onClose={closeCampaignDialog}
        onSave={saveCampaign}
        saving={saving}
        form={campaignForm}
        setField={setCampaignField}
        activePrefixes={activePrefixes}
      />

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={closeSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VoucherMainPage;
