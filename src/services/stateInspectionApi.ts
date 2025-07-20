import axios from 'axios';
import { 
  StateInspectionRecord, 
  FleetAccount, 
  CreateStateInspectionFormData, 
  StateInspectionFilters,
  StateInspectionStats 
} from '../types/stateInspection';

const getBaseUrl = () => {
  // Use dynamic hostname detection for network access, with HTTPS support
  return import.meta.env.VITE_API_BASE_URL || 
         `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:5001`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add pagination interface
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// State Inspection Records API
export const getStateInspectionRecords = async (
  filters?: StateInspectionFilters, 
  pagination?: PaginationParams
): Promise<StateInspectionRecord[] | PaginatedResponse<StateInspectionRecord>> => {
  const params = { 
    ...filters, 
    ...(pagination && {
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 50
    })
  };
  
  const response = await api.get('/api/state-inspection-records', { params });
  return response.data;
};

export const getStateInspectionRecord = async (id: string): Promise<StateInspectionRecord> => {
  const response = await api.get(`/api/state-inspection-records/${id}`);
  return response.data;
};

export const createStateInspectionRecord = async (data: CreateStateInspectionFormData): Promise<StateInspectionRecord> => {
  const formData = new FormData();
  
  // Append all form fields
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'tintAffidavit' && value instanceof File) {
      formData.append(key, value);
    } else if (value !== undefined) {
      formData.append(key, String(value));
    }
  });

  const response = await api.post('/api/state-inspection-records', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateStateInspectionRecord = async (id: string, data: Partial<CreateStateInspectionFormData>): Promise<StateInspectionRecord> => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'tintAffidavit' && value instanceof File) {
      formData.append(key, value);
    } else if (value !== undefined) {
      formData.append(key, String(value));
    }
  });

  const response = await api.put(`/api/state-inspection-records/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteStateInspectionRecord = async (id: string): Promise<void> => {
  await api.delete(`/api/state-inspection-records/${id}`);
};

export const getStateInspectionStats = async (filters?: StateInspectionFilters): Promise<StateInspectionStats> => {
  const response = await api.get('/api/state-inspection-records/stats', { params: filters });
  return response.data;
};

// Fleet Accounts API
export const getFleetAccounts = async (): Promise<FleetAccount[]> => {
  const response = await api.get('/api/fleet-accounts');
  return response.data;
};

export const getFleetAccount = async (id: string): Promise<FleetAccount> => {
  const response = await api.get(`/api/fleet-accounts/${id}`);
  return response.data;
};

export const createFleetAccount = async (data: Omit<FleetAccount, 'id' | 'createdDate' | 'updatedDate'>): Promise<FleetAccount> => {
  const response = await api.post('/api/fleet-accounts', data);
  return response.data;
};

export const updateFleetAccount = async (id: string, data: Partial<FleetAccount>): Promise<FleetAccount> => {
  const response = await api.put(`/api/fleet-accounts/${id}`, data);
  return response.data;
};

export const deleteFleetAccount = async (id: string): Promise<void> => {
  await api.delete(`/api/fleet-accounts/${id}`);
};

export const uploadTintAffidavit = async (file: File): Promise<{ url: string; filename: string }> => {
  const formData = new FormData();
  formData.append('tintAffidavit', file);

  const response = await api.post('/api/state-inspection-records/upload-tint-affidavit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getUploadUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  
  // If it's already an absolute URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Use environment variable if set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return `${envUrl.replace('/api', '')}${relativePath}`;
  }
  
  // Convert relative path to absolute URL
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const hostname = window.location.hostname;
  const port = '5001';
  const baseUrl = `${protocol}://${hostname}:${port}`;
  
  return `${baseUrl}${relativePath}`;
}; 