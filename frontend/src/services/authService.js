import api from './api';

const authService = {
  login: async (credentials) => {
    const response = await api.post(
      '/auth/login',
      credentials
    );

    const data = response?.data;

    if (data?.token) {
      // Store complete user information
      localStorage.setItem(
        'user',
        JSON.stringify(data)
      );

      // Store token separately
      localStorage.setItem(
        'token',
        data.token
      );

      // Store role separately
      if (data.role) {
        localStorage.setItem(
          'role',
          data.role
        );
      }

      // Store username separately when available
      if (data.username) {
        localStorage.setItem(
          'username',
          data.username
        );
      }
    }

    return data;
  },

  register: async (userData) => {
    const response = await api.post(
      '/auth/register',
      userData
    );

    return response.data;
  },

  logout: () => {
    // Remove all authentication information
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
  },

  getCurrentUser: () => {
    const storedUser =
      localStorage.getItem('user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error(
        'Invalid stored user data:',
        error
      );

      localStorage.removeItem('user');
      return null;
    }
  },

  isAuthenticated: () => {
    return Boolean(
      localStorage.getItem('token') ||
      localStorage.getItem('user')
    );
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  getRole: () => {
    return localStorage.getItem('role');
  },
};

export default authService;