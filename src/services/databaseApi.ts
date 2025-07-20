import axios, { AxiosInstance } from 'axios';
import { getItem } from './safariStorage';

export interface TableData {
  columns: string[];
  rows: any[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TableSchema {
  columns: Array<{
    name: string;
    type: string;
    notNull: boolean;
    primaryKey: boolean;
  }>;
  dateColumns: string[];
  searchableColumns: string[];
}

// Use the same approach as the main API service
const getBaseUrl = () => {
  // Use environment variable if set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    console.log('🌐 Using env API URL:', envUrl);
    return envUrl;
  }
  
  // Always use HTTPS in development for mixed content security
  const protocol = 'https';
  const hostname = window.location.hostname;
  
  // In development with localhost, use direct HTTPS connection (no proxy for mixed content)
  if (import.meta.env.DEV) {
    const backendUrl = `${protocol}://${hostname}:5001/api`;
    console.log('🔒 Using direct HTTPS API URL:', backendUrl);
    return backendUrl;
  }
  
  // In production, use same-origin HTTPS
  const port = window.location.port;
  const productionUrl = `${protocol}://${hostname}${port ? `:${port}` : ''}/api`;
  console.log('🔒 Using production HTTPS API URL:', productionUrl);
  return productionUrl;
};

// Enhanced axios instance with HTTPS enforcement (same as main API)
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disable credentials for Safari compatibility
  timeout: 20000, // Increased timeout for HTTPS
  // Additional HTTPS-specific configurations
  httpsAgent: undefined, // Let browser handle HTTPS
});

// Simplified request interceptor for Safari compatibility (same as main API)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getItem('token'); // Use Safari-compatible storage
    
    console.log('🔒 Database API Request:', config.method?.toUpperCase(), config.url);
    console.log('Protocol:', config.baseURL?.startsWith('https') ? 'HTTPS ✅' : 'HTTP ❌');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Auth token added');
    }
    
    // Ensure HTTPS URLs
    if (config.baseURL && config.baseURL.startsWith('http://')) {
      console.warn('🚨 Converting HTTP to HTTPS in request');
      config.baseURL = config.baseURL.replace('http://', 'https://');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Simplified response interceptor for Safari compatibility (same as main API)
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Database API Response:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ Database API Error:', error.code, error.message);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - clearing storage');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userId');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

class DatabaseApi {
  /**
   * Get list of all available database tables
   */
  async getTables(): Promise<string[]> {
    try {
      const response = await axiosInstance.get('/tables');
      // The API returns { tables: [...], count: number }
      return response.data.tables || response.data;
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network connection error. Please check your internet connection and server certificates.');
      }
      throw new Error('Failed to fetch database tables');
    }
  }

  /**
   * Get data from a specific table
   */
  async getTableData(
    tableName: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<TableData> {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.search) params.append('search', options.search);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await axiosInstance.get(`/${tableName}?${params.toString()}`);
      
      // Extract column names from the first row if available
      const columns = response.data.data && response.data.data.length > 0 
        ? Object.keys(response.data.data[0])
        : [];

      return {
        columns,
        rows: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        totalPages: response.data.totalPages || 1,
        hasNext: response.data.hasNext || false,
        hasPrev: response.data.hasPrev || false
      };
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
      throw new Error(`Failed to fetch data for table ${tableName}`);
    }
  }

  /**
   * Get schema information for a specific table
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    try {
      const response = await axiosInstance.get(`/tables/${tableName}/schema`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching schema for table ${tableName}:`, error);
      throw new Error(`Failed to fetch schema for table ${tableName}`);
    }
  }

  /**
   * Get a specific record by ID
   */
  async getRecord(tableName: string, id: string): Promise<any> {
    try {
      const response = await axiosInstance.get(`/${tableName}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching record ${id} from table ${tableName}:`, error);
      throw new Error(`Failed to fetch record from table ${tableName}`);
    }
  }

  /**
   * Create a new record
   */
  async createRecord(tableName: string, data: any): Promise<any> {
    try {
      const response = await axiosInstance.post(`/${tableName}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error creating record in table ${tableName}:`, error);
      throw new Error(`Failed to create record in table ${tableName}`);
    }
  }

  /**
   * Update an existing record
   */
  async updateRecord(tableName: string, id: string, data: any): Promise<any> {
    try {
      const response = await axiosInstance.put(`/${tableName}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating record ${id} in table ${tableName}:`, error);
      throw new Error(`Failed to update record in table ${tableName}`);
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(tableName: string, id: string): Promise<void> {
    try {
      await axiosInstance.delete(`/${tableName}/${id}`);
    } catch (error) {
      console.error(`Error deleting record ${id} from table ${tableName}:`, error);
      throw new Error(`Failed to delete record from table ${tableName}`);
    }
  }
}

export const databaseApi = new DatabaseApi(); 