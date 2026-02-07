import { client } from '../../../../shared/api/client';

const BASE_URL = 'lookup';

// Helper auth header
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const LookupService = {

    // =========================================================
    // 1. PRODUCT TYPES (/api/lookup/product-types)
    // =========================================================
    
    getAllProductTypes: async () => {
        return client(`${BASE_URL}/product-types`, { headers: getAuthHeaders() });
    },

    getActiveProductTypes: async () => {
        return client(`${BASE_URL}/product-types/active`, { headers: getAuthHeaders() });
    },

    createProductType: async (data) => {
        return client(`${BASE_URL}/product-types`, {
            method: 'POST',
            body: data,
            headers: getAuthHeaders()
        });
    },

    updateProductType: async (id, data) => {
        return client(`${BASE_URL}/product-types/${id}`, {
            method: 'PUT',
            body: data,
            headers: getAuthHeaders()
        });
    },

    deleteProductType: async (id) => {
        return client(`${BASE_URL}/product-types/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
    },

    // =========================================================
    // 2. UNITS OF MEASURE (/api/lookup/units-of-measure)
    // =========================================================

    getAllUnits: async () => {
        return client(`${BASE_URL}/units-of-measure`, { headers: getAuthHeaders() });
    },

    getActiveUnits: async () => {
        return client(`${BASE_URL}/units-of-measure/active`, { headers: getAuthHeaders() });
    },

    createUnit: async (data) => {
        return client(`${BASE_URL}/units-of-measure`, {
            method: 'POST',
            body: data,
            headers: getAuthHeaders()
        });
    },

    updateUnit: async (id, data) => {
        return client(`${BASE_URL}/units-of-measure/${id}`, {
            method: 'PUT',
            body: data,
            headers: getAuthHeaders()
        });
    },

    deleteUnit: async (id) => {
        return client(`${BASE_URL}/units-of-measure/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
    },

    // =========================================================
    // 3. VAT RATES (/api/lookup/vat-rates)
    // =========================================================

    getAllVatRates: async () => {
        return client(`${BASE_URL}/vat-rates`, { headers: getAuthHeaders() });
    },

    getActiveVatRates: async () => {
        return client(`${BASE_URL}/vat-rates/active`, { headers: getAuthHeaders() });
    },

    createVatRate: async (data) => {
        return client(`${BASE_URL}/vat-rates`, {
            method: 'POST',
            body: data,
            headers: getAuthHeaders()
        });
    },

    updateVatRate: async (id, data) => {
        return client(`${BASE_URL}/vat-rates/${id}`, {
            method: 'PUT',
            body: data,
            headers: getAuthHeaders()
        });
    },

    deleteVatRate: async (id) => {
        return client(`${BASE_URL}/vat-rates/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
    }
};