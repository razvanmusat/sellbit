import { client } from './client';

export const AuthService = {
  login: async (username, password) => {
    return client('security/auth/login', {
      body: { username, password }
    });
  },

  changeOwnPassword: async (oldPassword, newPassword) => {
    return client('security/users/me/password', {
      method: 'PATCH',
      body: { oldPassword, newPassword }
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};