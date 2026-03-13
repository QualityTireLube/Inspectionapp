import axios, { AxiosError, AxiosInstance } from 'axios';
import { getToken, isTokenExpired, logout, scheduleAutoLogout } from './auth';

// Create a shared Axios instance with auth interceptors
const api: AxiosInstance = axios.create({
  // Keep baseURL undefined; each service sets its own or uses absolute URLs
  withCredentials: false,
  timeout: 30000,
});

// Request interceptor: attach token or logout if expired/missing
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      logout();
      return Promise.reject(new Error('Auth token missing/expired'));
    }
    // Ensure auto-logout is scheduled while app makes calls
    scheduleAutoLogout(token);
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: logout on 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      logout();
    }
    return Promise.reject(error);
  }
);

export default api;


