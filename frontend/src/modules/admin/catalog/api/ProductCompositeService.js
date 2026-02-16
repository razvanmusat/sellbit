import { client } from '../../../../shared/api/client'; // Asigură-te că importul pointează corect către client.js-ul tău

const BASE_URL = 'catalog/product-components';

// Helper pentru auth (identic cu cel din CategoryBrowserService)
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const ProductCompositeService = {

    /**
     * [ADMIN & POS] - Obține configurația activă a unui meniu.
     * Endpoint: GET /api/catalog/product-components/parent/{parentId}/active
     */
    getActiveComponents: async (parentId) => {
        return client(`${BASE_URL}/parent/${parentId}/active`, {
            headers: getAuthHeaders()
        });
    },

    /**
     * [ADMIN] - Obține istoricul configurațiilor (inactive).
     * Endpoint: GET /api/catalog/product-components/parent/{parentId}/inactive
     */
    getInactiveComponents: async (parentId) => {
        return client(`${BASE_URL}/parent/${parentId}/inactive`, {
            headers: getAuthHeaders()
        });
    },

    /**
     * [ADMIN] - Creează o configurație nouă.
     * Endpoint: POST /api/catalog/product-components
     */
    createComposition: async (request) => {
        return client(BASE_URL, {
            method: 'POST',
            body: request,
            data: request,
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        });
    },

    /**
     * [ADMIN] - Actualizează configurația (Soft Delete + Insert).
     * Endpoint: PUT /api/catalog/product-components
     */
    updateComposition: async (request) => {
        return client(BASE_URL, {
            method: 'PUT',
            body: request,
            data: request,
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        });
    },

    /**
     * [ADMIN] - Șterge logic tot rețetarul unui părinte.
     * Endpoint: DELETE /api/catalog/product-components/parent/{parentId}
     */
    softDeleteComposition: async (parentId) => {
        return client(`${BASE_URL}/parent/${parentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
    }
};