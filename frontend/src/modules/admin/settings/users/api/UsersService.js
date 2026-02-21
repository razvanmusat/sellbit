import { client } from '../../../../../shared/api/client';

const USERS_ENDPOINT = 'security/users';
const ROLES_ENDPOINT = 'lookup/user-roles/active';

export const UsersService = {
    getActiveUsers: async () => {
        return await client(`${USERS_ENDPOINT}/active`);
    },

    getInactiveUsers: async () => {
        return await client(`${USERS_ENDPOINT}/inactive`);
    },

    getActiveRoles: async () => {
        return await client(ROLES_ENDPOINT);
    },

    createUser: async (data) => {
        return await client(USERS_ENDPOINT, { body: data });
    },

    updateUser: async (id, data) => {
        return await client(`${USERS_ENDPOINT}/${id}`, { method: 'PUT', body: data });
    },

    toggleUserStatus: async (id) => {
        return await client(`${USERS_ENDPOINT}/${id}/toggle-status`, { method: 'PATCH' });
    },

    resetPassword: async (id) => {
        return await client(`${USERS_ENDPOINT}/${id}/reset-password`, { method: 'PATCH' });
    },

    reactivateUser: async (id) => {
        await client(`${USERS_ENDPOINT}/${id}/toggle-status`, { method: 'PATCH' });
        return await client(`${USERS_ENDPOINT}/${id}/reset-password`, { method: 'PATCH' });
    }
};
