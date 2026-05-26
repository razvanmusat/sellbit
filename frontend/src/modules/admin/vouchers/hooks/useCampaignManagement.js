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
    const isGiftCard = campaignData.campaignType === 'GIFT_CARD';
    const payload = {
      name: campaignData.name.trim(),
      campaignType: campaignData.campaignType,
      validFromDate: campaignData.validFromDate,
      validUntilDate: campaignData.validUntilDate,
      discountType: isGiftCard ? null : (campaignData.discountType || null),
      discountValue: isGiftCard ? null : parseNumberOrNull(campaignData.discountValue),
      maxDiscountAmount: parseNumberOrNull(campaignData.maxDiscountAmount),
      minAmount: isGiftCard ? null : parseNumberOrNull(campaignData.minAmount),
      minHoursPlayed: parseIntOrNull(campaignData.minHoursPlayed),
      requiredProductIds: Array.isArray(campaignData.requiredProductIds) && campaignData.requiredProductIds.length ? campaignData.requiredProductIds : null,
      applicableProductId: parseIntOrNull(campaignData.applicableProductId),
      vouchersPerReceipt: parseIntOrNull(campaignData.vouchersPerReceipt) ?? 1,
      stampsRequired: parseIntOrNull(campaignData.stampsRequired),
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
    const isGiftCard = campaignData.campaignType === 'GIFT_CARD';
    const payload = {
      name: campaignData.name.trim(),
      campaignType: campaignData.campaignType,
      validFromDate: campaignData.validFromDate,
      validUntilDate: campaignData.validUntilDate,
      discountType: isGiftCard ? null : (campaignData.discountType || null),
      discountValue: isGiftCard ? null : parseNumberOrNull(campaignData.discountValue),
      maxDiscountAmount: parseNumberOrNull(campaignData.maxDiscountAmount),
      minAmount: isGiftCard ? null : parseNumberOrNull(campaignData.minAmount),
      minHoursPlayed: parseIntOrNull(campaignData.minHoursPlayed),
      requiredProductIds: Array.isArray(campaignData.requiredProductIds) && campaignData.requiredProductIds.length ? campaignData.requiredProductIds : null,
      applicableProductId: parseIntOrNull(campaignData.applicableProductId),
      vouchersPerReceipt: parseIntOrNull(campaignData.vouchersPerReceipt) ?? 1,
      stampsRequired: parseIntOrNull(campaignData.stampsRequired),
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
