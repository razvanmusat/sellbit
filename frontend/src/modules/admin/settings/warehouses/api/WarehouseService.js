import { client } from '../../../../../shared/api/client';

const ENDPOINT = 'warehouses';

export const WarehouseService = {
    // GET: Listare active
    getAllActive: async () => {
        return await client(`${ENDPOINT}/active`);
    },

    // GET: Listare inactive
    getAllInactive: async () => {
        return await client(`${ENDPOINT}/inactive`);
    },

    // POST: Creare
    create: async (data) => {
        // data trebuie să fie { code, name }
        return await client(ENDPOINT, { body: data });
    },

    // PUT: Actualizare
    update: async (data) => {
        // data trebuie să fie { id, code, name }
        return await client(ENDPOINT, { method: 'PUT', body: data });
    },

    // PATCH: Toggle Status (Activare/Dezactivare)
    toggleStatus: async (id) => {
        return await client(`${ENDPOINT}/${id}/toggle-status`, { method: 'PATCH' });
    }
};