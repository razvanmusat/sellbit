import { client } from '../../../../shared/api/client';

const BASE_URL = 'voucher/customer-vouchers';

const buildQuery = (fromDate, toDate) => {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  return params.toString();
};

export const CustomerVoucherService = {
  getAll: async () => client(BASE_URL),

  getUsed: async (fromDate = null, toDate = null) => {
    const query = buildQuery(fromDate, toDate);
    return client(`${BASE_URL}/used${query ? '?' + query : ''}`);
  },

  getAvailable: async (fromDate = null, toDate = null) => {
    const query = buildQuery(fromDate, toDate);
    return client(`${BASE_URL}/available${query ? '?' + query : ''}`);
  },

  reactivate: async (code) => client(`${BASE_URL}/reactivate/${encodeURIComponent(code)}`, { method: 'POST' }),

  validate: async (code) => client(`${BASE_URL}/validate/${encodeURIComponent(code)}`),
};
