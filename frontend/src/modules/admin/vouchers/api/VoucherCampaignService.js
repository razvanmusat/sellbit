import { client } from '../../../../shared/api/client';

const BASE_URL = 'voucher/voucher-campaigns';

export const VoucherCampaignService = {
  getAll: async () => client(BASE_URL),

  getActive: async () => client(`${BASE_URL}/active`),

  getInactive: async () => client(`${BASE_URL}/inactive`),

  getActivePrefixes: async () => client(`${BASE_URL}/active-prefixes`),

  create: async (data) => client(BASE_URL, { method: 'POST', body: data }),

  update: async (id, data) => client(`${BASE_URL}/${id}`, { method: 'PUT', body: data }),

  toggleStatus: async (id) => client(`${BASE_URL}/${id}/toggle`, { method: 'PATCH' }),

  getGiftCardStatus: async () => client(`${BASE_URL}/gift-card-status`),

  issueLoyaltyVoucher: async (campaignId, receiptId) =>
    client(`${BASE_URL}/${campaignId}/issue-loyalty?receiptId=${receiptId}`, { method: 'POST' }),

  addStamp: async (campaignId, cashierId, receiptId) => {
    const params = new URLSearchParams();
    if (cashierId != null) params.append('cashierId', cashierId);
    if (receiptId != null) params.append('receiptId', receiptId);
    const query = params.toString();
    return client(`${BASE_URL}/${campaignId}/stamp${query ? `?${query}` : ''}`, { method: 'POST' });
  },

  getLoyaltyStats: async (campaignId, fromDate = null, toDate = null) => {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const query = params.toString();
    return client(`${BASE_URL}/${campaignId}/loyalty-stats${query ? `?${query}` : ''}`);
  },

  getIssuedByReceipt: async (receiptId) => client(`${BASE_URL}/issued-by-receipt/${receiptId}`),
};
