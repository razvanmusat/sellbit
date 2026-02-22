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
    requestDeactivateVoucherByCode,
    fromDate,
    toDate,
    updateDateRange,
    getDefaultDateRange,
  } = useVoucherMainPage();

  return (
    <Box>    
      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
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
          onDeactivateByCode={requestDeactivateVoucherByCode}
          fromDate={fromDate}
          toDate={toDate}
          onDateChange={updateDateRange}
          getDefaultDateRange={getDefaultDateRange}
        />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirmare acțiune</DialogTitle>
        <DialogContent>
          <Typography>
            {(confirmDialog.type === 'reactivate-voucher' || confirmDialog.type === 'reactivate-voucher-code') && (
              <>Reactivezi voucherul {confirmDialog.payload?.code}? Folosește această acțiune doar dacă a fost marcat greșit ca utilizat.</>
            )}
            {confirmDialog.type === 'deactivate-voucher-code' && (
              <>Dezactivezi manual voucherul {confirmDialog.payload?.code}? Recomandat în caz de fraudă sau cod compromis.</>
            )}
            {(confirmDialog.type === 'deactivate-campaign' || confirmDialog.type === 'activate-campaign') && (
              <>Schimbi statusul campaniei {confirmDialog.payload?.name}?</>
            )}
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="inherit" disabled={saving}>Anulează</Button>
          <Button onClick={confirmAction} variant="contained" disabled={saving}>
            Confirmă
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
