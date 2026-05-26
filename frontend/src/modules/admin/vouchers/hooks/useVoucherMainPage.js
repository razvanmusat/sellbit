import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCampaignManagement } from './useCampaignManagement';
import { useVoucherFilters } from './useVoucherFilters';
import { useVoucherSearch } from './useVoucherSearch';

const INITIAL_CAMPAIGN_FORM = {
  id: null,
  name: '',
  campaignType: 'REGULAR',
  validFromDate: '',
  validUntilDate: '',
  discountType: '',
  discountValue: '',
  maxDiscountAmount: '',
  minAmount: '',
  minHoursPlayed: '',
  requiredProductIds: [],
  requiredProductNames: [],
  applicableProductId: '',
  applicableProductName: '',
  vouchersPerReceipt: 1,
  stampsRequired: '',
  validDays: '',
  applicableDays: '',
  prefix: '',
  codeLength: 4,
  receiptTemplate: '',
  isReactivating: false,
  oldValidFromDate: null,
  oldValidUntilDate: null,
};

export const useVoucherMainPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'campaigns';
  const [activeTab, setActiveTabState] = useState(tabParam);

  const campaigns = useCampaignManagement();
  const voucherFilters = useVoucherFilters();
  const voucherSearch = useVoucherSearch();

  const [saving, setSaving] = useState(false);
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN_FORM);
  const [activePrefixes, setActivePrefixes] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, payload: null });

  const setActiveTab = useCallback((newTab) => {
    setActiveTabState(newTab);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', newTab);
      return newParams;
    });
  }, [setSearchParams]);

  useEffect(() => {
    campaigns.loadCampaigns();
  }, []);

  useEffect(() => {
    if (voucherFilters.filter === 'search') {
      voucherSearch.clearResult();
      loadActivePrefixes();
    }
  }, [voucherFilters.filter]);

  const loadActivePrefixes = async () => {
    const prefixes = await campaigns.getActivePrefixes();
    setActivePrefixes(prefixes);
    if (prefixes.length === 1) {
      voucherSearch.setPrefix(prefixes[0]);
    }
  };

  const sortedCampaigns = useMemo(() => {
    return [...campaigns.campaigns].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [campaigns.campaigns]);

  const openCreateCampaign = async () => {
    setCampaignForm(INITIAL_CAMPAIGN_FORM);
    setOpenCampaignDialog(true);
    await loadActivePrefixes();
  };

  const openEditCampaign = async (campaign) => {
    const today = new Date().toISOString().split('T')[0];
    const isExpired = campaign.validUntilDate && campaign.validUntilDate < today;

    setCampaignForm({
      id: campaign.id,
      name: campaign.name || '',
      campaignType: campaign.campaignType || 'REGULAR',
      validFromDate: campaign.validFromDate || '',
      validUntilDate: campaign.validUntilDate || '',
      discountType: campaign.discountType || '',
      discountValue: campaign.discountValue ?? '',
      maxDiscountAmount: campaign.maxDiscountAmount ?? '',
      minAmount: campaign.minAmount ?? '',
      minHoursPlayed: campaign.minHoursPlayed ?? '',
      requiredProductIds: campaign.requiredProductIds ?? [],
      requiredProductNames: campaign.requiredProductNames ?? [],
      applicableProductId: campaign.applicableProductId ?? '',
      applicableProductName: campaign.applicableProductName || '',
      vouchersPerReceipt: campaign.vouchersPerReceipt ?? 1,
      stampsRequired: campaign.stampsRequired ?? '',
      validDays: campaign.validDays ?? '',
      applicableDays: campaign.applicableDays || '',
      prefix: campaign.prefix || '',
      codeLength: campaign.codeLength ?? 4,
      receiptTemplate: campaign.receiptTemplate || '',
      isReactivating: isExpired,
      oldValidFromDate: isExpired ? campaign.validFromDate : null,
      oldValidUntilDate: isExpired ? campaign.validUntilDate : null,
    });
    setOpenCampaignDialog(true);
    await loadActivePrefixes();
  };

  const closeCampaignDialog = () => {
    if (saving) return;
    setOpenCampaignDialog(false);
    setCampaignForm(INITIAL_CAMPAIGN_FORM);
  };

  const setCampaignField = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveCampaign = async () => {
    if (!campaignForm.name?.trim()) {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza denumirea campaniei.' });
      return;
    }
    if (!campaignForm.validFromDate || !campaignForm.validUntilDate) {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza intervalul de valabilitate.' });
      return;
    }
    if (campaignForm.isReactivating) {
      if (campaignForm.validFromDate === campaignForm.oldValidFromDate &&
          campaignForm.validUntilDate === campaignForm.oldValidUntilDate) {
        setSnackbar({
          open: true,
          severity: 'warning',
          message: 'Campania a expirat. Selecteaza o noua perioada pentru reactivare (date diferite de cea anterioara).',
        });
        return;
      }
    }
    const isGiftCard = campaignForm.campaignType === 'GIFT_CARD';
    const isLoyalty = campaignForm.campaignType === 'LOYALTY';
    if (!isGiftCard) {
      if (!campaignForm.discountType || campaignForm.discountValue === '') {
        setSnackbar({ open: true, severity: 'warning', message: 'Completeaza tipul si valoarea discountului.' });
        return;
      }
      if (campaignForm.discountType === 'PERCENT' && campaignForm.maxDiscountAmount === '') {
        setSnackbar({ open: true, severity: 'warning', message: 'Completeaza suma maxima a discountului pentru discount procentual.' });
        return;
      }
      if (campaignForm.minAmount === '') {
        setSnackbar({ open: true, severity: 'warning', message: 'Completeaza suma minima a bonului.' });
        return;
      }
    }
    if (campaignForm.validDays === '') {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza valabilitatea voucherului (zile).' });
      return;
    }
    if (isLoyalty && (campaignForm.stampsRequired === '' || Number(campaignForm.stampsRequired) < 1)) {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza numarul de stampile necesare.' });
      return;
    }
    if (campaignForm.applicableDays?.trim()) {
      const daysValue = campaignForm.applicableDays.trim();
      const daysPattern = /^[1-7](,[1-7])*$/;
      if (!daysPattern.test(daysValue)) {
        setSnackbar({
          open: true,
          severity: 'warning',
          message: 'Format invalid pentru zile aplicabile. Foloseste formatul: 1,3,5 (cu virgula).',
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (campaignForm.id) {
        await campaigns.updateCampaign(campaignForm.id, campaignForm);
        setSnackbar({ open: true, severity: 'success', message: 'Campania de vouchere a fost actualizata.' });
      } else {
        await campaigns.createCampaign(campaignForm);
        setSnackbar({ open: true, severity: 'success', message: 'Campania de vouchere a fost creata.' });
      }
      closeCampaignDialog();
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const requestToggleCampaign = (campaign) => {
    const nextStatus = campaign.active ? 'deactivate-campaign' : 'activate-campaign';
    setConfirmDialog({ open: true, type: nextStatus, payload: campaign });
  };

  const requestReactivateVoucher = (voucher) => {
    setConfirmDialog({ open: true, type: 'reactivate-voucher', payload: voucher });
  };

  const requestReactivateVoucherByCode = (code) => {
    setConfirmDialog({ open: true, type: 'reactivate-voucher-code', payload: { code } });
  };

  const requestDeactivateVoucherByCode = (code) => {
    setConfirmDialog({ open: true, type: 'deactivate-voucher-code', payload: { code } });
  };

  const closeConfirmDialog = () => {
    if (saving) return;
    setConfirmDialog({ open: false, type: null, payload: null });
  };

  const confirmAction = async () => {
    if (!confirmDialog.payload) return;
    setSaving(true);
    try {
      if (confirmDialog.type === 'deactivate-campaign' || confirmDialog.type === 'activate-campaign') {
        await campaigns.toggleCampaignStatus(confirmDialog.payload.id);
        setSnackbar({ open: true, severity: 'success', message: 'Statusul campaniei a fost actualizat.' });
      }
      if (confirmDialog.type === 'reactivate-voucher' || confirmDialog.type === 'reactivate-voucher-code') {
        await voucherSearch.reactivateVoucher(confirmDialog.payload.code);
        await voucherFilters.refreshVouchers();
        setSnackbar({ open: true, severity: 'success', message: 'Voucherul a fost reactivat.' });
      }
      if (confirmDialog.type === 'deactivate-voucher-code') {
        await voucherSearch.deactivateVoucher(confirmDialog.payload.code);
        await voucherFilters.refreshVouchers();
        setSnackbar({ open: true, severity: 'success', message: 'Voucherul a fost dezactivat manual.' });
      }
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: error.message });
    } finally {
      setSaving(false);
      setConfirmDialog({ open: false, type: null, payload: null });
    }
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const validateVoucherCode = async () => {
    try {
      await voucherSearch.validateCode(activePrefixes);
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: error.message });
    }
  };

  const getDefaultDateRange = useCallback(() => {
    return {
      fromDate: voucherFilters.getDefaultFromDate(),
      toDate: voucherFilters.getDefaultToDate(),
    };
  }, []);

  return {
    activeTab,
    setActiveTab,
    campaignsLoading: campaigns.loading,
    vouchersLoading: voucherFilters.loading,
    sortedCampaigns,
    vouchers: voucherFilters.vouchers,
    voucherFilter: voucherFilters.filter,
    setVoucherFilter: voucherFilters.setFilter,
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
    searchPrefix: voucherSearch.prefix,
    setSearchPrefix: voucherSearch.setPrefix,
    searchCode: voucherSearch.code,
    setSearchCode: voucherSearch.setCode,
    searchResult: voucherSearch.result,
    searchLoading: voucherSearch.loading,
    validateVoucherCode,
    requestReactivateVoucherByCode,
    requestDeactivateVoucherByCode,
    fromDate: voucherFilters.fromDate,
    toDate: voucherFilters.toDate,
    updateDateRange: voucherFilters.updateDateRange,
    getDefaultDateRange,
  };
};
