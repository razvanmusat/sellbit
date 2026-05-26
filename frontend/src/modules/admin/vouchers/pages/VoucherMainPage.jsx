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
import LoyaltyStatsTab from '../components/LoyaltyStatsTab';
import {
  printVoucherHtml,
  buildRegularVoucherHtml,
  buildGiftCardHtml,
  buildLoyaltyCardHtml,
} from '../../../../shared/utils/printVoucher';

const FAKE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateFakeSuffix(length = 4) {
  return Array.from({ length }, () => FAKE_CHARS[Math.floor(Math.random() * FAKE_CHARS.length)]).join('');
}

async function previewCampaign(campaign) {
  const suffix = generateFakeSuffix(campaign.codeLength || 4);
  const code = campaign.prefix ? `${campaign.prefix}-${suffix}` : suffix;
  const isGiftCard = campaign.campaignType === 'GIFT_CARD';
  let expiresAt = campaign.validUntilDate;
  if (isGiftCard && campaign.validDays) {
    const d = new Date();
    d.setDate(d.getDate() + campaign.validDays);
    expiresAt = d.toISOString().slice(0, 10);
  }
  const params = {
    code,
    discountType: campaign.discountType,
    discountValue: isGiftCard ? 1200 : campaign.discountValue,
    expiresAt,
    receiptTemplate: campaign.receiptTemplate,
    stampsRequired: campaign.stampsRequired,
  };
  let html;
  if (isGiftCard) html = await buildGiftCardHtml(params);
  else if (campaign.campaignType === 'LOYALTY') html = await buildLoyaltyCardHtml(params);
  else html = await buildRegularVoucherHtml(params);
  printVoucherHtml(html);
}

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
        <Tab label="Fidelitate" value="loyalty" />
      </Tabs>

      {activeTab === 'campaigns' && (
        <CampaignsPage
          campaignsLoading={campaignsLoading}
          sortedCampaigns={sortedCampaigns}
          saving={saving}
          onCreateCampaign={openCreateCampaign}
          onEditCampaign={openEditCampaign}
          onToggleCampaign={requestToggleCampaign}
          onPreviewCampaign={previewCampaign}
        />
      )}

      {activeTab === 'loyalty' && (
        <LoyaltyStatsTab campaigns={sortedCampaigns} />
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
