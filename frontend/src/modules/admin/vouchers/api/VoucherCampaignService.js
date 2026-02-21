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
};
