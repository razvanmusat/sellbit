import { useCallback, useState } from 'react';
import { VoucherCampaignService } from '../api/VoucherCampaignService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

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

export const useCampaignManagement = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await VoucherCampaignService.getAll();
      setCampaigns(data || []);
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (campaignData) => {
    const payload = {
      name: campaignData.name.trim(),
      validFromDate: campaignData.validFromDate,
      validUntilDate: campaignData.validUntilDate,
      discountType: campaignData.discountType,
      discountValue: parseNumberOrNull(campaignData.discountValue),
      maxDiscountAmount: parseNumberOrNull(campaignData.maxDiscountAmount),
      minAmount: parseNumberOrNull(campaignData.minAmount),
      minHoursPlayed: parseIntOrNull(campaignData.minHoursPlayed),
      requiredProductId: parseIntOrNull(campaignData.requiredProductId),
      applicableProductId: parseIntOrNull(campaignData.applicableProductId),
      validDays: parseIntOrNull(campaignData.validDays),
      applicableDays: campaignData.applicableDays?.trim() || null,
      prefix: campaignData.prefix?.trim() ? campaignData.prefix.trim().toUpperCase() : null,
      codeLength: parseIntOrNull(campaignData.codeLength),
      receiptTemplate: campaignData.receiptTemplate?.trim() || null,
    };

    await VoucherCampaignService.create(payload);
    await loadCampaigns();
  }, [loadCampaigns]);

  const updateCampaign = useCallback(async (campaignId, campaignData) => {
    const payload = {
      name: campaignData.name.trim(),
      validFromDate: campaignData.validFromDate,
      validUntilDate: campaignData.validUntilDate,
      discountType: campaignData.discountType,
      discountValue: parseNumberOrNull(campaignData.discountValue),
      maxDiscountAmount: parseNumberOrNull(campaignData.maxDiscountAmount),
      minAmount: parseNumberOrNull(campaignData.minAmount),
      minHoursPlayed: parseIntOrNull(campaignData.minHoursPlayed),
      requiredProductId: parseIntOrNull(campaignData.requiredProductId),
      applicableProductId: parseIntOrNull(campaignData.applicableProductId),
      validDays: parseIntOrNull(campaignData.validDays),
      applicableDays: campaignData.applicableDays?.trim() || null,
      prefix: campaignData.prefix?.trim() ? campaignData.prefix.trim().toUpperCase() : null,
      codeLength: parseIntOrNull(campaignData.codeLength),
      receiptTemplate: campaignData.receiptTemplate?.trim() || null,
    };

    await VoucherCampaignService.update(campaignId, payload);
    await loadCampaigns();
  }, [loadCampaigns]);

  const toggleCampaignStatus = useCallback(async (campaignId) => {
    await VoucherCampaignService.toggleStatus(campaignId);
    await loadCampaigns();
  }, [loadCampaigns]);

  const getActivePrefixes = useCallback(async () => {
    try {
      const prefixes = await VoucherCampaignService.getActivePrefixes();
      return prefixes || [];
    } catch {
      return [];
    }
  }, []);

  return {
    campaigns,
    loading,
    loadCampaigns,
    createCampaign,
    updateCampaign,
    toggleCampaignStatus,
    getActivePrefixes,
  };
};
