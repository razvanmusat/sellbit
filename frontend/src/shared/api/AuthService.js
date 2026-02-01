import { client } from './client';

export const AuthService = {
  login: async (username, password) => {
    return client('security/auth/login', {
      body: { username, password }
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};