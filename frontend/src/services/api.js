import axios from 'axios';

export const clearAuthStorage = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
};

const instance =
  typeof axios.create === 'function'
    ? axios.create({
        baseURL: 'http://localhost:8080/api',
      })
    : undefined;

const api = instance || axios;

// Request interceptor
if (api && api.interceptors) {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      let storedToken = token;

      if (!storedToken && userStr) {
        try {
          const user = JSON.parse(userStr);

          if (user?.token) {
            storedToken = user.token;
          }
        } catch (error) {
          console.error('Invalid stored user data:', error);
        }
      }

      if (storedToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${storedToken}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearAuthStorage();

        if (
          typeof window !== 'undefined' &&
          window.location &&
          window.location.pathname !== '/login'
        ) {
          try {
            window.location.href = '/login';
          } catch (redirectError) {
            // Ignore redirect errors during tests
          }
        }
      }

      return Promise.reject(error);
    }
  );
}


export default api;