import { client } from '../../../../shared/api/client';

// Endpoint-ul de bază (fără /api, client.js îl adaugă automat)
const ENDPOINT = 'catalog/categories';

export const CategoryService = {
    // 1. Navigare Admin (Arbore complet)
    getAdminTree: async (parentId) => {
        // Clientul transformă automat obiectul params în ?parentId=...
        return await client(`${ENDPOINT}/admin/tree`, {
            params: { parentId }
        });
    },

    // 2. Categorii Frunză (Leafs)
    getLeafCategories: async () => {
        return await client(`${ENDPOINT}/leaves`);
    },

    // 3. CRUD Create
    createCategory: async (categoryData) => {
        // Dacă trimitem 'body', clientul pune automat method: 'POST' (dar putem fi expliciți)
        return await client(ENDPOINT, {
            body: categoryData
        });
    },

    // 4. CRUD Update
    updateCategory: async (id, categoryData) => {
        return await client(`${ENDPOINT}/${id}`, {
            method: 'PUT',
            body: categoryData
        });
    },

    // 5. Toggle Status
    toggleStatus: async (id, targetStatus) => {
        return await client(`${ENDPOINT}/${id}/status`, {
            method: 'PATCH',
            params: { active: targetStatus }
        });
    }
};