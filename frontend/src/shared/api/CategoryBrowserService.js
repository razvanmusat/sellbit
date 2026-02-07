import { client } from './client';

const BASE_URL = 'catalog/categories';

// Helper pentru a extrage token-ul din localStorage și a crea header-ul de autorizare
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const CategoryBrowserService = {

    // =========================================================
    // NAVIGARE & POS (READ ONLY)
    // =========================================================

    /**
     * [POS & NAVIGARE] - Returnează categoriile ACTIVE.
     * Endpoint: GET /api/catalog/categories?parentId=...
     */
    getActiveCategories: async (parentId = null) => {
        return client(BASE_URL, {
            params: parentId ? { parentId } : {},
            headers: getAuthHeaders()
        });
    },

    /**
     * [NAVIGARE] - Returnează detaliile unei categorii specifice.
     * Endpoint: GET /api/catalog/categories/{id}
     */
    getCategoryDetails: async (id) => {
        return client(`${BASE_URL}/${id}`, {
            headers: getAuthHeaders()
        });
    },

    // =========================================================
    // ADMIN (READ OPERATIONS)
    // =========================================================

    /**
     * [ADMIN] - Returnează structura completă (Active + Inactive).
     * Endpoint: GET /api/catalog/categories/admin/tree
     */
    getAdminCategories: async (parentId = null) => {
        return client(`${BASE_URL}/admin/tree`, {
            params: parentId ? { parentId } : {},
            headers: getAuthHeaders()
        });
    },

    /**
     * [ADMIN] - Returnează categoriile "frunză" (care pot conține produse).
     * Endpoint: GET /api/catalog/categories/leaves
     */
    getLeafCategories: async () => {
        return client(`${BASE_URL}/leaves`, {
            headers: getAuthHeaders()
        });
    },

    /**
     * [ADMIN] - Toate categoriile sub formă de listă plată.
     * Endpoint: GET /api/catalog/categories/all
     */
    getAllCategories: async () => {
        return client(`${BASE_URL}/all`, {
            headers: getAuthHeaders()
        });
    },

    // =========================================================
    // ADMIN (WRITE OPERATIONS)
    // =========================================================

    /**
     * [ADMIN] - Creează o categorie nouă.
     * Endpoint: POST /api/catalog/categories
     * Body: CategoryDTO
     */
    createCategory: async (categoryDTO) => {
        return client(BASE_URL, { 
            method: 'POST',
            body: categoryDTO, // body pentru logica custom din client.js
            data: categoryDTO, // data preventiv
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        });
    },

    /**
     * [ADMIN] - Actualizează o categorie existentă.
     * Endpoint: PUT /api/catalog/categories/{id}
     * Body: CategoryDTO
     */
    updateCategory: async (id, categoryDTO) => {
        return client(`${BASE_URL}/${id}`, { 
            method: 'PUT', 
            body: categoryDTO,
            data: categoryDTO,
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        });
    },

    /**
     * [ADMIN] - Activează/Dezactivează o categorie (Ștergere logică).
     * Endpoint: PATCH /api/catalog/categories/{id}/status?active=...
     * FIX CRITIC: Specificăm explicit method: 'PATCH' pentru că nu avem body!
     */
    toggleStatus: async (id, isActive) => {
        return client(`${BASE_URL}/${id}/status`, { 
            method: 'PATCH', // <--- ASTA LIPSEA SI CAUZA EROAREA (client.js punea GET din oficiu)
            params: { active: isActive },
            headers: getAuthHeaders()
        });
    }
};