import axios, { AxiosError, AxiosInstance } from 'axios';
import { getToken, isTokenExpired, logout, scheduleAutoLogout } from './auth';

// Create a shared Axios instance with auth interceptors
const api: AxiosInstance = axios.create({
  // Keep baseURL undefined; each service sets its own or uses absolute URLs
  withCredentials: false,
  timeout: 30000,
});

// Request interceptor: attach token if present, reject silently if missing
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      return Promise.reject(new Error('Auth token missing/expired'));
    }
    scheduleAutoLogout(token);
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: propagate errors without forcing a redirect
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error)
);

export default api;


