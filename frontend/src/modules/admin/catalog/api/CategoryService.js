import axios from 'axios';
import { store } from '../../../../shared/store/index';

const API_URL = '/api/catalog/categories';

// Funcție pentru a injecta automat Token-ul din Redux în headerele Axios
const getAuthHeaders = () => {
    const state = store.getState();
    const token = state.auth.token;
    return {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
};

export const CategoryService = {
    // 1. Navigare Admin (Arbore complet)
    getAdminTree: async (parentId) => {
        const config = getAuthHeaders();
        config.params = parentId ? { parentId } : {};
        const response = await axios.get(`${API_URL}/admin/tree`, config);
        return response.data;
    },

    // 2. Categorii Frunză (Leafs) - ADAUGĂ ASTA PENTRU MUTARE
    getLeafCategories: async () => {
        const response = await axios.get(`${API_URL}/leaves`, getAuthHeaders());
        return response.data;
    },

    // 3. CRUD Create
    createCategory: async (categoryData) => {
        const response = await axios.post(API_URL, categoryData, getAuthHeaders());
        return response.data;
    },

    // 4. CRUD Update
    updateCategory: async (id, categoryData) => {
        const response = await axios.put(`${API_URL}/${id}`, categoryData, getAuthHeaders());
        return response.data;
    },

    // 5. Toggle Status
    toggleStatus: async (id, targetStatus) => {
        const config = getAuthHeaders();
        config.params = { active: targetStatus };
        await axios.patch(`${API_URL}/${id}/status`, null, config);
    }
};