import { client } from '../../../../shared/api/client';

const BASE_URL = 'catalog/products';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const ProductService = {

    // --- ADMIN READ ---
    getProductsForAdmin: async (categoryId) => {
        return client(`${BASE_URL}/admin`, {
            params: { categoryId },
            headers: getAuthHeaders()
        });
    },

    searchForAdmin: async (query) => {
        return client(`${BASE_URL}/admin/search`, {
            params: { query },
            headers: getAuthHeaders()
        });
    },

    getMenusForAdmin: async () => {
        return client(`${BASE_URL}/admin/menus`, {
            headers: getAuthHeaders()
        });
    },

    // --- POS READ ---
    getProductsForPos: async (categoryId) => {
        return client(`${BASE_URL}/pos`, {
            params: { categoryId },
            headers: getAuthHeaders()
        });
    },

    searchForPos: async (query) => {
        return client(`${BASE_URL}/pos/search`, {
            params: { query },
            headers: getAuthHeaders()
        });
    },

    getByBarcode: async (barcode) => {
        return client(`${BASE_URL}/pos/barcode/${barcode}`, {
            headers: getAuthHeaders()
        });
    },

    // --- WRITE OPERATIONS ---
    create: async (productDTO) => {
        return client(BASE_URL, {
            method: 'POST',
            body: productDTO,
            headers: getAuthHeaders()
        });
    },

    update: async (id, productDTO) => {
        return client(`${BASE_URL}/${id}`, {
            method: 'PUT',
            body: productDTO,
            headers: getAuthHeaders()
        });
    },

    move: async (id, newCategoryId) => {
        return client(`${BASE_URL}/${id}/move`, {
            method: 'PATCH',
            params: { newCategoryId },
            headers: getAuthHeaders()
        });
    },

    // FIX CRITIC: Toggle status cu parametru in URL (ca la categorii)
    toggleStatus: async (id, isActive) => {
        return client(`${BASE_URL}/${id}/status?active=${isActive}`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
    }
};