import { client } from '../../../../../shared/api/client';

const ENDPOINT = 'store';

export const StoreService = {
  getStore: async () => {
    return await client(ENDPOINT);
  },

  saveOrUpdateStore: async (data) => {
    return await client(ENDPOINT, { body: data });
  },

  isConfigured: async () => {
    return await client(`${ENDPOINT}/is-configured`);
  },
};
