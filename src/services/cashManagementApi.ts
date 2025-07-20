import axios from 'axios';
import { 
  BankDeposit, 
  DrawerCount, 
  DrawerSettings, 
  CashAnalytics, 
  CashManagementFilters 
} from '../types/cashManagement';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:5001`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Bank Deposit API
export const submitBankDeposit = async (deposit: Omit<BankDeposit, 'id' | 'timestamp' | 'userId' | 'userName'>): Promise<BankDeposit> => {
  const response = await api.post('/api/cash-management/bank-deposits', deposit);
  return response.data;
};

export const getBankDeposits = async (filters?: CashManagementFilters): Promise<BankDeposit[]> => {
  const response = await api.get('/api/cash-management/bank-deposits', { params: filters });
  return response.data;
};

export const getBankDepositById = async (id: number): Promise<BankDeposit> => {
  const response = await api.get(`/api/cash-management/bank-deposits/${id}`);
  return response.data;
};

export const deleteBankDeposit = async (id: number): Promise<void> => {
  await api.delete(`/api/cash-management/bank-deposits/${id}`);
};

// Drawer Count API
export const submitDrawerCount = async (drawerCount: Omit<DrawerCount, 'id' | 'timestamp' | 'userId' | 'userName'>): Promise<DrawerCount> => {
  const response = await api.post('/api/cash-management/drawer-counts', drawerCount);
  return response.data;
};

export const getDrawerCounts = async (filters?: CashManagementFilters): Promise<DrawerCount[]> => {
  const response = await api.get('/api/cash-management/drawer-counts', { params: filters });
  return response.data;
};

export const getDrawerCountById = async (id: number): Promise<DrawerCount> => {
  const response = await api.get(`/api/cash-management/drawer-counts/${id}`);
  return response.data;
};

export const deleteDrawerCount = async (id: number): Promise<void> => {
  await api.delete(`/api/cash-management/drawer-counts/${id}`);
};

export const updateDrawerCount = async (id: number, drawerCount: Partial<DrawerCount>): Promise<DrawerCount> => {
  const response = await api.put(`/api/cash-management/drawer-counts/${id}`, drawerCount);
  return response.data;
};

// Drawer Settings API
export const getDrawerSettings = async (): Promise<DrawerSettings[]> => {
  const response = await api.get('/api/cash-management/drawer-settings');
  return response.data;
};

export const createDrawerSettings = async (settings: Omit<DrawerSettings, 'createdAt' | 'updatedAt'>): Promise<DrawerSettings> => {
  const response = await api.post('/api/cash-management/drawer-settings', settings);
  return response.data;
};

export const updateDrawerSettings = async (id: string, settings: Partial<DrawerSettings>): Promise<DrawerSettings> => {
  const response = await api.put(`/api/cash-management/drawer-settings/${id}`, settings);
  return response.data;
};

export const deleteDrawerSettings = async (id: string): Promise<void> => {
  await api.delete(`/api/cash-management/drawer-settings/${id}`);
};

// Analytics API
export const getCashAnalytics = async (filters?: CashManagementFilters): Promise<CashAnalytics> => {
  const response = await api.get('/api/cash-management/analytics', { params: filters });
  return response.data;
};

// Image upload for bank deposits
export const uploadDepositImages = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`images`, file);
  });

  const response = await api.post('/api/cash-management/upload-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data.filenames;
};

// Utility functions
export const calculateTotalCash = (denominations: any): number => {
  const values = {
    pennies: 0.01,
    nickels: 0.05,
    dimes: 0.10,
    quarters: 0.25,
    ones: 1.00,
    fives: 5.00,
    tens: 10.00,
    twenties: 20.00,
    fifties: 50.00,
    hundreds: 100.00,
  };

  return Object.entries(denominations).reduce((total, [key, quantity]) => {
    return total + (values[key as keyof typeof values] || 0) * (quantity as number);
  }, 0);
};

export const calculateCashOut = (current: any, target: any): any => {
  const cashOut: any = {};
  
  Object.keys(current).forEach(key => {
    const currentAmount = current[key] || 0;
    const targetAmount = target[key] || 0;
    cashOut[key] = Math.max(0, currentAmount - targetAmount);
  });
  
  return cashOut;
}; 