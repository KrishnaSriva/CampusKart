import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL 
  || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : 'https://campuskart-wxbq.onrender.com');

// Strip trailing slash if present, ensure /api is attached
const cleanBackendUrl = BACKEND_URL.replace(/\/+$/, '');
const API_BASE = cleanBackendUrl.endsWith('/api') ? cleanBackendUrl : `${cleanBackendUrl}/api`;
export const SOCKET_URL = cleanBackendUrl.replace(/\/api$/, '');

// Axios instance with base URL
const api = axios.create({
  baseURL: API_BASE,
});

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If a request fails with 401 (token expired), silently refresh and retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.expired && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, { refreshToken });

        // Store the new access token
        localStorage.setItem('token', data.accessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token itself is expired — force a full logout
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
