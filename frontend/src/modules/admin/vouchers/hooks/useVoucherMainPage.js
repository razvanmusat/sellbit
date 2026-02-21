import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';
import { VoucherCampaignService } from '../api/VoucherCampaignService';
import { CustomerVoucherService } from '../api/CustomerVoucherService';
import { fetchAvailableVouchers, fetchUsedVouchers, invalidateVouchers } from '../store/customerVouchersSlice';

const INITIAL_CAMPAIGN_FORM = {
  id: null,
  name: '',
  validFromDate: '',
  validUntilDate: '',
  discountType: '',
  discountValue: '',
  minAmount: '',
  minHoursPlayed: '',
  requiredProductId: '',
  requiredProductName: '',
  applicableProductId: '',
  applicableProductName: '',
  validDays: '',
  applicableDays: '',
  prefix: '',
  codeLength: 4,
  receiptTemplate: '',
  isReactivating: false,
  oldValidFromDate: null,
  oldValidUntilDate: null,
};

const parseNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseIntOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const useVoucherMainPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const reduxVouchers = useSelector((state) => state.customerVouchers);
  const { available: reduxAvailable, used: reduxUsed, loadingAvailable, loadingUsed } = reduxVouchers;
  
  // Initialize date defaults (1st of current month to today)
  const getDefaultFromDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };
  const getDefaultToDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check URL params, fallback to defaults
  const fromDateParam = searchParams.get('fromDate') || getDefaultFromDate();
  const toDateParam = searchParams.get('toDate') || getDefaultToDate();
  const tabParam = searchParams.get('tab') || 'campaigns';
  const filterParam = searchParams.get('filter') || ''; // Empty string means no filter selected

  const [activeTab, setActiveTabState] = useState(tabParam);
  const [campaigns, setCampaigns] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [voucherFilter, setVoucherFilterState] = useState(filterParam);
  const [fromDate, setFromDate] = useState(fromDateParam);
  const [toDate, setToDate] = useState(toDateParam);
  const [saving, setSaving] = useState(false);
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN_FORM);
  const [activePrefixes, setActivePrefixes] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, payload: null });
  const [searchPrefix, setSearchPrefix] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Sync date changes to URL
  const updateDateRange = useCallback((newFromDate, newToDate) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('fromDate', newFromDate);
      newParams.set('toDate', newToDate);
      return newParams;
    });
  }, [setSearchParams]);

  // Sync tab changes to URL
  const setActiveTab = useCallback((newTab) => {
    setActiveTabState(newTab);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', newTab);
      return newParams;
    });
  }, [setSearchParams]);

  // Sync filter changes to URL
  const setVoucherFilter = useCallback((newFilter) => {
    setVoucherFilterState(newFilter);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('filter', newFilter);
      // Remove date params when switching to search tab
      if (newFilter === 'search') {
        newParams.delete('fromDate');
        newParams.delete('toDate');
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Sync URL params on mount if not already set
  useEffect(() => {
    // Only add date params if we're on the vouchers tab
    if (tabParam === 'vouchers') {
      const hasDateParams = searchParams.has('fromDate') && searchParams.has('toDate');
      if (!hasDateParams) {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set('fromDate', getDefaultFromDate());
          newParams.set('toDate', getDefaultToDate());
          return newParams;
        });
      }
    }
  }, []);

  // Preload available vouchers when entering vouchers tab (with defaults)
  useEffect(() => {
    if (activeTab === 'vouchers' && fromDate && toDate) {
      // Check if we already have available vouchers cached with current date range
      const isCached = 
        reduxVouchers.lastFetchParams.availableFromDate === fromDate &&
        reduxVouchers.lastFetchParams.availableToDate === toDate;
      if (!isCached) {
        dispatch(fetchAvailableVouchers({ fromDate, toDate }));
      }
    }
  }, [activeTab, fromDate, toDate, dispatch, reduxVouchers.lastFetchParams]);

  // Preload used vouchers when entering vouchers tab (with defaults)
  useEffect(() => {
    if (activeTab === 'vouchers' && fromDate && toDate) {
      // Check if we already have used vouchers cached with current date range
      const isCached = 
        reduxVouchers.lastFetchParams.usedFromDate === fromDate &&
        reduxVouchers.lastFetchParams.usedToDate === toDate;
      if (!isCached) {
        dispatch(fetchUsedVouchers({ fromDate, toDate }));
      }
    }
  }, [activeTab, fromDate, toDate, dispatch, reduxVouchers.lastFetchParams]);

  // Cleanup: invalidate vouchers when leaving the vouchers tab
  useEffect(() => {
    return () => {
      if (activeTab !== 'vouchers') {
        dispatch(invalidateVouchers());
      }
    };
  }, [activeTab, dispatch]);

  // Load vouchers in background when filter changes (only if parameters changed)
  useEffect(() => {
    if (voucherFilter === 'available' && fromDate && toDate) {
      // Check if we already have these params cached
      const isCached = 
        reduxVouchers.lastFetchParams.availableFromDate === fromDate &&
        reduxVouchers.lastFetchParams.availableToDate === toDate;
      if (!isCached) {
        dispatch(fetchAvailableVouchers({ fromDate, toDate }));
      }
    } else if (voucherFilter === 'used' && fromDate && toDate) {
      // Check if we already have these params cached
      const isCached = 
        reduxVouchers.lastFetchParams.usedFromDate === fromDate &&
        reduxVouchers.lastFetchParams.usedToDate === toDate;
      if (!isCached) {
        dispatch(fetchUsedVouchers({ fromDate, toDate }));
      }
    }
  }, [voucherFilter, fromDate, toDate, dispatch, reduxVouchers.lastFetchParams]);

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [campaigns]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const data = await VoucherCampaignService.getAll();
      setCampaigns(data || []);
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const loadActivePrefixes = useCallback(async () => {
    try {
      const prefixes = await VoucherCampaignService.getActivePrefixes();
      setActivePrefixes(prefixes || []);
      if ((prefixes || []).length === 1) {
        setSearchPrefix(prefixes[0]);
      }
    } catch (error) {
      setActivePrefixes([]);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Sync Redux vouchers to local state when they change
  useEffect(() => {
    if (voucherFilter === 'available') {
      setVouchers(reduxAvailable);
    } else if (voucherFilter === 'used') {
      setVouchers(reduxUsed);
    }
  }, [reduxAvailable, reduxUsed, voucherFilter]);

  useEffect(() => {
    if (voucherFilter === 'search') {
      loadActivePrefixes();
      setSearchResult(null);
    }
  }, [voucherFilter, loadActivePrefixes]);

  const refreshCampaigns = async () => {
    await loadCampaigns();
  };

  const openCreateCampaign = async () => {
    setCampaignForm(INITIAL_CAMPAIGN_FORM);
    setOpenCampaignDialog(true);
    await loadActivePrefixes();
  };

  const openEditCampaign = async (campaign) => {
    // Detectez daca campania e expirata dar nu dezactivata inca (reactivare)
    const today = new Date().toISOString().split('T')[0];
    const isExpired = campaign.validUntilDate && campaign.validUntilDate < today;
    
    setCampaignForm({
      id: campaign.id,
      name: campaign.name || '',
      validFromDate: campaign.validFromDate || '',
      validUntilDate: campaign.validUntilDate || '',
      discountType: campaign.discountType || '',
      discountValue: campaign.discountValue ?? '',
      minAmount: campaign.minAmount ?? '',
      minHoursPlayed: campaign.minHoursPlayed ?? '',
      requiredProductId: campaign.requiredProductId ?? '',
      requiredProductName: campaign.requiredProductName || '',
      applicableProductId: campaign.applicableProductId ?? '',
      applicableProductName: campaign.applicableProductName || '',
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
    // Validare reactivare - date trebuie diferite de cea anterioara
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
    if (!campaignForm.discountType || campaignForm.discountValue === '') {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza tipul si valoarea discountului.' });
      return;
    }
    if (campaignForm.minAmount === '') {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza suma minima a bonului.' });
      return;
    }
    if (campaignForm.validDays === '') {
      setSnackbar({ open: true, severity: 'warning', message: 'Completeaza valabilitatea voucherului (zile).' });
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
      const payload = {
        name: campaignForm.name.trim(),
        validFromDate: campaignForm.validFromDate,
        validUntilDate: campaignForm.validUntilDate,
        discountType: campaignForm.discountType,
        discountValue: parseNumberOrNull(campaignForm.discountValue),
        minAmount: parseNumberOrNull(campaignForm.minAmount),
        minHoursPlayed: parseIntOrNull(campaignForm.minHoursPlayed),
        requiredProductId: parseIntOrNull(campaignForm.requiredProductId),
        applicableProductId: parseIntOrNull(campaignForm.applicableProductId),
        validDays: parseIntOrNull(campaignForm.validDays),
        applicableDays: campaignForm.applicableDays?.trim() || null,
        prefix: campaignForm.prefix?.trim() ? campaignForm.prefix.trim().toUpperCase() : null,
        codeLength: parseIntOrNull(campaignForm.codeLength),
        receiptTemplate: campaignForm.receiptTemplate?.trim() || null,
      };

      if (campaignForm.id) {
        await VoucherCampaignService.update(campaignForm.id, payload);
      } else {
        await VoucherCampaignService.create(payload);
      }
      await loadCampaigns();
      closeCampaignDialog();
      setSnackbar({
        open: true,
        severity: 'success',
        message: campaignForm.id ? 'Campania de vouchere a fost actualizata.' : 'Campania de vouchere a fost creata.',
      });
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
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

  const closeConfirmDialog = () => {
    if (saving) return;
    setConfirmDialog({ open: false, type: null, payload: null });
  };

  const requestReactivateVoucherByCode = (code) => {
    setConfirmDialog({ open: true, type: 'reactivate-voucher-code', payload: { code } });
  };

  const confirmAction = async () => {
    if (!confirmDialog.payload) return;
    setSaving(true);
    try {
      if (confirmDialog.type === 'deactivate-campaign' || confirmDialog.type === 'activate-campaign') {
        await VoucherCampaignService.toggleStatus(confirmDialog.payload.id);
        await loadCampaigns();
        setSnackbar({ open: true, severity: 'success', message: 'Statusul campaniei a fost actualizat.' });
      }
      if (confirmDialog.type === 'reactivate-voucher' || confirmDialog.type === 'reactivate-voucher-code') {
        await CustomerVoucherService.reactivate(confirmDialog.payload.code);
        // Re-fetch vouchers from Redux
        if (voucherFilter === 'available' && fromDate && toDate) {
          dispatch(fetchAvailableVouchers({ fromDate, toDate }));
        } else if (voucherFilter === 'used' && fromDate && toDate) {
          dispatch(fetchUsedVouchers({ fromDate, toDate }));
        }
        setSnackbar({ open: true, severity: 'success', message: 'Voucherul a fost reactivat.' });
        if (confirmDialog.type === 'reactivate-voucher-code') {
          setSearchResult(null);
          setSearchCode('');
        }
      }
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setSaving(false);
      setConfirmDialog({ open: false, type: null, payload: null });
    }
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const validateVoucherCode = async () => {
    const suffix = searchCode.trim().toUpperCase();
    if (!suffix) {
      setSnackbar({ open: true, severity: 'warning', message: 'Introdu un cod de voucher.' });
      return;
    }
    if (activePrefixes.length > 1 && !searchPrefix) {
      setSnackbar({ open: true, severity: 'warning', message: 'Selecteaza un prefix de campanie.' });
      return;
    }

    const prefixValue = (searchPrefix || '').trim();
    const normalizedPrefix = prefixValue ? prefixValue.replace(/-+$/g, '') : '';
    const code = normalizedPrefix ? `${normalizedPrefix}-${suffix}` : suffix;
    setSearchLoading(true);
    try {
      const result = await CustomerVoucherService.validate(code);
      setSearchResult(result || null);
    } catch (error) {
      setSearchResult(null);
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setSearchLoading(false);
    }
  };

  const getDefaultDateRange = useCallback(() => {
    return {
      fromDate: getDefaultFromDate(),
      toDate: getDefaultToDate(),
    };
  }, []);

  return {
    activeTab,
    setActiveTab,
    campaignsLoading,
    vouchersLoading: loadingAvailable || loadingUsed,
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
  };
};
