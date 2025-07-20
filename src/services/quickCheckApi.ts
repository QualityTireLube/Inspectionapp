import axios from 'axios';

interface QuickCheckResponse {
  id: number;
  user_email: string;
  user_name: string;
  title: string;
  data: string;
  created_at: string;
}

interface ApiResponse<T> {
  data: T;
}

const getApiBaseUrl = () => {
  // Use environment variable if set, otherwise use dynamic protocol detection
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return `${envUrl}/api`;
  }
  
  // Use HTTPS if the frontend is served over HTTPS, otherwise use HTTP
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${window.location.hostname}:5001/api`;
};

// Create a simple axios instance
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Simple submit function
export const submitQuickCheck = async (formData: FormData): Promise<QuickCheckResponse> => {
  for (let pair of formData.entries()) {
    console.log(pair[0], pair[1]);
  }
  const response = await apiClient.post<ApiResponse<QuickCheckResponse>>('/quick-checks', formData);
  return response.data.data;
};

// Simple get history function
export const getQuickCheckHistory = async (): Promise<any[]> => {
  const response = await apiClient.get<ApiResponse<any[]>>('/quick-checks/history');
  return response.data.data;
};

// Delete a quick check by ID
export const deleteQuickCheck = async (id: number): Promise<void> => {
  await apiClient.delete(`/quick-checks/${id}`);
};

// Export a simple API object
export const quickCheckApi = {
  submit: submitQuickCheck,
  getHistory: getQuickCheckHistory,
  delete: deleteQuickCheck
};

export default quickCheckApi; 