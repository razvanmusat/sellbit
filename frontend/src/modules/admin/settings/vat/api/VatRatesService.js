import { client } from '../../../../../shared/api/client';

const BASE_URL = 'lookup/vat-rates';

export const VatRatesService = {
  getAll: async () => {
    return client(BASE_URL);
  },

  create: async (data) => {
    return client(BASE_URL, {
      method: 'POST',
      body: data,
    });
  },

  update: async (id, data) => {
    return client(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  deactivate: async (id) => {
    return client(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },
};
