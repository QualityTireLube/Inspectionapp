import axios, { AxiosInstance } from 'axios';
import { getItem, setItem, removeItem } from './safariStorage';
import tokenManager from './tokenManager';

interface LoginResponse {
  token: string;
  email: string;
  name: string;
  role: string;
  userId: string;
  tokenType: string;
  expiresIn: number;
}

export interface QuickCheckData {
  inspection_type: string;
  vin: string;
  vehicle_details: string;
  date: string;
  user: string;
  mileage: string;
  windshield_condition: string;
  wiper_blades: string;
  wiper_blades_front?: string;
  wiper_blades_rear?: string;
  washer_squirters: string;
  dash_lights_photos: { url: string }[];
  // Field-specific photos
  mileage_photos?: { url: string }[];
  windshield_condition_photos?: { url: string }[];
  wiper_blades_photos?: { url: string }[];
  washer_squirters_photos?: { url: string }[];
  vin_photos?: { url: string }[];
  state_inspection_status_photos?: { url: string }[];
  state_inspection_date_code_photos?: { url: string }[];
  battery_date_code_photos?: { url: string }[];
  tire_repair_status_photos?: { url: string }[];
  tpms_type_photos?: { url: string }[];
  front_brake_pads_photos?: { url: string }[];
  rear_brake_pads_photos?: { url: string }[];
  tpms_placard: { url: string }[];
  state_inspection_status: string;
  state_inspection_month: number | null;
  state_inspection_date_code?: string;
  washer_fluid: string;
  washer_fluid_photo: { url: string }[];
  engine_air_filter: string;
  engine_air_filter_photo: { url: string }[];
  battery_condition: string | string[];
  battery_condition_main?: string;
  battery_terminals?: string[];
  battery_terminal_damage_location?: string[];
  battery_photos: { url: string }[];
  battery_date_code?: string;
  tpms_tool_photo: { url: string }[];
  passenger_front_tire: string;
  driver_front_tire: string;
  driver_rear_tire: string;
  passenger_rear_tire: string;
  spare_tire: string;
  front_brakes: { url: string }[];
  rear_brakes: { url: string }[];
  front_brake_pads: {
    inner: number;
    outer: number;
    rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
  } | {
    driver: {
      inner: string;
      outer: string;
      rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
    };
    passenger: {
      inner: string;
      outer: string;
      rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
    };
  };
  rear_brake_pads: {
    inner: number;
    outer: number;
    rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
  } | {
    driver: {
      inner: string;
      outer: string;
      rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
    };
    passenger: {
      inner: string;
      outer: string;
      rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
    };
  };
  tire_photos: { type: string; photos: { url: string }[] }[];
  undercarriage_photos: { url: string }[];
  tire_repair_status: string;
  tire_repair_zones: { position: string; status: string | null }[];
  tpms_type: string;
  tpms_zones: { position: string; status: string | null }[];
  tire_rotation: string;
  static_sticker: string;
  drain_plug_type: string;
  notes: string;
  // Additional fields from form data
  field_notes?: { [key: string]: string };
  tab_timings?: {
    info_duration: number;
    pulling_duration: number;
    underhood_duration: number;
    tires_duration: number;
  };
  created_datetime?: string;
  submitted_datetime?: string;
  archived_datetime?: string;
  lastSaved?: string;
  savedBy?: string;
  submitted_by?: string;
  submitted_by_name?: string;
  tire_repair_statuses: {
    driver_front: 'repairable' | 'non_repairable' | null;
    passenger_front: 'repairable' | 'non_repairable' | null;
    driver_rear_outer: 'repairable' | 'non_repairable' | null;
    driver_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_outer: 'repairable' | 'non_repairable' | null;
    spare: 'repairable' | 'non_repairable' | null;
  };
  tire_repair_images?: {
    driver_front?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
    passenger_front?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
    driver_rear_outer?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
    driver_rear_inner?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
    passenger_rear_inner?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
    passenger_rear_outer?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
    spare?: {
      not_repairable: { url: string }[];
      tire_size_brand: { url: string }[];
      repairable_spot: { url: string }[];
    };
  };
  tpms_statuses: {
    driver_front: boolean | null;
    passenger_front: boolean | null;
    driver_rear_outer: boolean | null;
    driver_rear_inner: boolean | null;
    passenger_rear_inner: boolean | null;
    passenger_rear_outer: boolean | null;
    spare: boolean | null;
  };
  tire_comments: {
    [key: string]: string[];
  };
  tire_dates: {
    [key: string]: string;
  };
  tire_tread: {
    driver_front: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    passenger_front: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    driver_rear: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    passenger_rear: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    spare: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
  };
}

interface QuickCheck {
  id: number;
  user_name: string;
  title: string;
  created_at: string;
  updated_at: string;
  saved_at?: string;
  data: QuickCheckData;
  archived_at?: string;
  archived_by?: string;
  archived_by_name?: string;
}

interface QuickCheckInput {
  title: string;
  data: any;
}

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
  const port = import.meta.env.DEV ? '5001' : window.location.port;
  
  // In development with localhost, use direct HTTPS connection (no proxy for mixed content)
  if (import.meta.env.DEV) {
    const backendUrl = `${protocol}://${hostname}:5001/api`;
    console.log('🔒 Using direct HTTPS API URL:', backendUrl);
    return backendUrl;
  }
  
  // In production, use same-origin HTTPS
  const productionUrl = `${protocol}://${hostname}${port ? `:${port}` : ''}/api`;
  console.log('🔒 Using production HTTPS API URL:', productionUrl);
  return productionUrl;
};

export const getUploadUrl = (relativePath: string): string => {
  // If it's already an absolute URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    // Ensure HTTP URLs are converted to HTTPS
    if (relativePath.startsWith('http://')) {
      console.warn('🔒 Converting HTTP upload URL to HTTPS:', relativePath);
      return relativePath.replace('http://', 'https://');
    }
    return relativePath;
  }
  
  // Use environment variable if set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return `${envUrl.replace('/api', '')}${relativePath}`;
  }
  
  // Convert relative path to absolute HTTPS backend URL
  const protocol = 'https'; // Always use HTTPS
  const hostname = window.location.hostname;
  const port = import.meta.env.DEV ? '5001' : '5001';
  const baseUrl = `${protocol}://${hostname}:${port}`;
  
  console.log('🔒 Using HTTPS upload URL:', `${baseUrl}${relativePath}`);
  return `${baseUrl}${relativePath}`;
};

// Enhanced axios instance with HTTPS enforcement
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

// Simplified request interceptor for Safari compatibility
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getItem('token'); // Use Safari-compatible storage
    
    console.log('🔒 API Request:', config.method?.toUpperCase(), config.url);
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

// Simplified response interceptor for Safari compatibility
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.code, error.message);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - clearing storage');
      // Use token manager to handle logout
      tokenManager.cleanup();
      removeItem('token');
      removeItem('userName');
      removeItem('userEmail');
      removeItem('userRole');
      removeItem('userId');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Simple API functions
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  // Normalize email for consistency
  const normalizedEmail = email.toLowerCase().trim();
  
  console.log('🔐 Login attempt:', normalizedEmail);
  console.log('API URL:', getBaseUrl());
  
  try {
    const requestData = { 
      email: normalizedEmail, 
      password 
    };
    
    const response = await axiosInstance.post<LoginResponse>('/login', requestData);
    
    console.log('✅ Login successful:', response.data.name);
    
    // Initialize token manager with the new token
    const token = response.data.token;
    if (token) {
      const tokenInfo = tokenManager.getTokenInfo(token);
      console.log('🔐 Token info:', {
        isValid: tokenInfo.isValid,
        expiresAt: tokenInfo.expiresAt,
        timeUntilExpiration: tokenInfo.timeUntilExpiration
      });
    }
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Login failed:', error.code, error.message);
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection error. Please check your internet connection and server certificates.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw error;
  }
};

export const register = async (email: string, password: string, name: string, pin: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post<{ message: string }>('/register', { email, password, name, pin });
  return response.data;
};

export const getQuickChecks = async (): Promise<QuickCheck[]> => {
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks');
  return response.data;
};

export const createQuickCheck = async (title: string, data: any): Promise<QuickCheck> => {
  const response = await axiosInstance.post<QuickCheck>('/quick-checks', { title, data });
  return response.data;
};

export const uploadQuickCheck = async (title: string, data: any, files?: File[]): Promise<{ id: number }> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('data', JSON.stringify(data));
  
  if (files) {
    files.forEach((file) => {
      formData.append('files', file);
    });
  }

  const response = await axiosInstance.post<{ id: number }>('/quick-checks', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Create draft quick check (when form is first opened)
export const createDraftQuickCheck = async (title: string, data?: any): Promise<{ id: number }> => {
  const response = await axiosInstance.post<{ id: number }>('/quick-checks/draft', {
    title,
    data: data ? JSON.stringify(data) : undefined
  });
  return response.data;
};

// Update draft quick check (tab change)
export const updateDraftQuickCheck = async (id: number, title: string, data: any): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/quick-checks/${id}/draft`, {
    title,
    data: JSON.stringify(data)
  });
  return response.data;
};

// Update draft quick check with files (tab change with file uploads)
export const updateDraftQuickCheckWithFiles = async (id: number, title: string, data: any, files: { [fieldName: string]: File[] }): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('data', JSON.stringify(data));
  
  // Add files to form data
  Object.entries(files).forEach(([fieldName, fileList]) => {
    fileList.forEach(file => {
      formData.append(fieldName, file);
    });
  });
  
  const response = await axiosInstance.put<{ message: string }>(`/quick-checks/${id}/draft/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Submit quick check (final submission)
export const submitQuickCheck = async (title: string, data: any, draftId?: number, files?: { [fieldName: string]: File[] }): Promise<{ id: number }> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('data', JSON.stringify(data));
  
  if (draftId) {
    formData.append('draftId', draftId.toString());
  }
  
  // Add files to form data if provided
  if (files) {
    Object.entries(files).forEach(([fieldName, fileArray]) => {
      fileArray.forEach(file => {
        formData.append(fieldName, file);
      });
    });
  }

  const response = await axiosInstance.post<{ id: number }>('/quick-checks', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Direct get history function
export const getQuickCheckHistory = async (): Promise<QuickCheck[]> => {
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks');
  return response.data;
};

export const getQuickCheckById = async (id: number): Promise<QuickCheck> => {
  const response = await axiosInstance.get<QuickCheck>(`/quick-checks/${id}`);
  return response.data;
};

export const getActiveQuickChecks = async (): Promise<QuickCheck[]> => {
  console.log('getActiveQuickChecks called, baseURL:', getBaseUrl()); // Debug log
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/active');
  console.log('getActiveQuickChecks response:', response); // Debug log
  return response.data;
};

export const getArchivedQuickChecks = async (): Promise<QuickCheck[]> => {
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/archived');
  return response.data;
};

export const getInProgressQuickChecks = async (): Promise<QuickCheck[]> => {
  console.log('getInProgressQuickChecks called, baseURL:', getBaseUrl()); // Debug log
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/in-progress');
  console.log('getInProgressQuickChecks response:', response); // Debug log
  return response.data;
};

export const getSubmittedQuickChecks = async (): Promise<QuickCheck[]> => {
  console.log('getSubmittedQuickChecks called, baseURL:', getBaseUrl()); // Debug log
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/submitted');
  console.log('getSubmittedQuickChecks response:', response); // Debug log
  return response.data;
};

export const updateQuickCheckStatus = async (id: number, status: 'pending' | 'submitted' | 'archived'): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/quick-checks/${id}/status`, { status });
  return response.data;
};

export const archiveQuickCheck = async (id: number): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/quick-checks/${id}/archive`);
  return response.data;
};

export const updateProfile = async (name: string, email: string, pin?: string): Promise<{ message: string }> => {
  const requestData: { name: string; email: string; pin?: string } = { name, email };
  if (pin !== undefined) {
    requestData.pin = pin;
  }
  const response = await axiosInstance.put<{ message: string }>('/profile', requestData);
  return response.data;
};

export const getUserProfile = async (): Promise<{ name: string; email: string; role: string; pin?: string }> => {
  const response = await axiosInstance.get<{ name: string; email: string; role: string; pin?: string }>('/profile');
  return response.data;
};

export const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>('/profile/password', { 
    currentPassword, 
    newPassword 
  });
  return response.data;
};

export const deleteAllUsers = async (): Promise<{ message: string }> => {
  const response = await axiosInstance.delete<{ message: string }>('/users');
  return response.data;
};

// User management functions
export const getUsers = async (): Promise<any[]> => {
  const response = await axiosInstance.get<any[]>('/users');
  return response.data;
};

export const deleteUser = async (email: string): Promise<{ message: string }> => {
  const response = await axiosInstance.delete<{ message: string }>(`/users/${email}`);
  return response.data;
};

export const enableUser = async (email: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/users/${email}/enable`);
  return response.data;
};

export const disableUser = async (email: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/users/${email}/disable`);
  return response.data;
};

export const updateUserRole = async (email: string, role: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/users/${email}/role`, { role });
  return response.data;
};

export const lookupUserByPin = async (pin: string): Promise<{ email: string; name: string; role: string }> => {
  const response = await axiosInstance.post<{ email: string; name: string; role: string }>('/users/lookup-by-pin', { pin });
  return response.data;
};

export const logout = async (): Promise<void> => {
  console.log('🚪 Logout - clearing Safari-compatible storage');
  
  // Use token manager to cleanup
  tokenManager.cleanup();
  
  // Use Safari-compatible storage removal
  removeItem('token');
  removeItem('userName');
  removeItem('userEmail');
  removeItem('userRole');
  removeItem('userId');
  console.log('✅ Storage cleared');
};

export const deleteQuickCheck = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/quick-checks/${id}`);
};

/**
 * Helper function to truncate decimal values to 2 decimal places
 * @param value - The string value to check and truncate if needed
 * @returns The value with decimals truncated to 2 places maximum
 */
export const truncateDecimalValues = (value: string): string => {
  if (!value || value === '' || value === 'Not Applicable' || value === '0') return value;
  
  // Check if the value is a number with decimals
  const numMatch = value.match(/^\d+\.\d+/);
  if (numMatch) {
    const numValue = parseFloat(numMatch[0]);
    // Truncate to 2 decimal places without rounding
    const truncated = Math.floor(numValue * 100) / 100;
    // Replace the original decimal part with the truncated version
    return value.replace(/^\d+\.\d+/, truncated.toFixed(2));
  }
  
  return value;
};

/**
 * Process VIN decoding results to truncate decimal values
 * @param data - The raw NHTSA API response data
 * @returns The processed data with truncated decimal values
 */
export const processVinDecodingResults = (data: any): any => {
  if (!data || !data.Results || !Array.isArray(data.Results)) {
    return data;
  }

  // Process each result to truncate decimal values
  const processedResults = data.Results.map((result: any) => ({
    ...result,
    Value: result.Value ? truncateDecimalValues(result.Value) : result.Value
  }));

  return {
    ...data,
    Results: processedResults
  };
};

/**
 * Format vehicle details from VIN decode results
 * @param vinData - The VIN decode response data
 * @returns Formatted string: "Year Make Model Engine L Cylinders cyl"
 */
export const formatVehicleDetails = (vinData: any): string => {
  if (!vinData || !vinData.Results || vinData.error) {
    return '';
  }

  const getValue = (variable: string): string => {
    const found = vinData.Results.find((r: any) => r.Variable === variable);
    return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
  };

  const year = getValue('Model Year');
  const make = getValue('Make');
  const model = getValue('Model');
  const engine = getValue('Displacement (L)');
  const cylinders = getValue('Engine Number of Cylinders');

  // Format engine displacement to max 2 decimal places
  const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';

  // Build the formatted string: "Year Make Model Engine L Cylinder cyl"
  const parts = [
    year,
    make,
    model,
    formattedEngine,
    cylinders ? cylinders + ' cyl' : ''
  ].filter(Boolean);

  return parts.join(' ');
};

/**
 * Decode a VIN using the backend proxy to NHTSA API (direct call, no caching)
 * @param vin - The 17-digit VIN string
 * @returns Decoded vehicle details from NHTSA with decimal values truncated to 2 places
 */
export const decodeVinNHTSA = async (vin: string): Promise<any> => {
  if (!vin || vin.length !== 17) {
    throw new Error('VIN must be 17 characters');
  }
  
  // Use backend proxy endpoint instead of direct NHTSA API call
  const response = await axiosInstance.get(`/vin/decode/${vin}`);
  
  // The backend already processes the results to truncate decimal values
  return response.data;
};

/**
 * Decode a VIN with caching logic to avoid unnecessary API calls
 * @param vin - The 17-digit VIN string
 * @returns Decoded vehicle details from cache or API
 */
export const decodeVinCached = async (vin: string): Promise<any> => {
  // Import here to avoid circular dependency
  const { vinCacheService } = await import('./vinCache');
  
  if (!vin || vin.length !== 17) {
    throw new Error('VIN must be 17 characters');
  }
  
  // Check cache first
  const cachedData = vinCacheService.getCachedData(vin);
  if (cachedData) {
    console.log('💾 VIN Decoder: Using cached data for:', vin);
    return cachedData;
  }
  
  // Check if we should make an API call
  if (!vinCacheService.shouldDecodeVin(vin)) {
    console.log('🚫 VIN Decoder: Skipping API call for:', vin);
    throw new Error('VIN decoding failed after multiple attempts');
  }
  
  try {
    console.log('🚀 VIN Decoder: Making API call for:', vin);
    const data = await decodeVinNHTSA(vin);
    
    // Cache the successful result
    vinCacheService.setCachedData(vin, data);
    
    return data;
  } catch (error) {
    // Increment failed attempts
    vinCacheService.incrementFailedAttempts(vin);
    throw error;
  }
};

export const getDraftQuickChecks = async (): Promise<QuickCheckResponse[]> => {
  const response = await axiosInstance.get<QuickCheckResponse[]>('/quick-checks/draft');
  return response.data;
};

export const deleteAllDrafts = async (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  const response = await axiosInstance.delete<{ success: boolean; message: string; deletedCount: number }>('/quick-checks/draft/bulk');
  return response.data;
};

// Delete a specific photo from a quick check
export const deleteQuickCheckPhoto = async (quickCheckId: number, field: string, position: number): Promise<void> => {
  try {
    const response = await fetch(`${getBaseUrl()}/quick-checks/${quickCheckId}/photos/${field}/${position}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete photo');
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

// Track tab entry
export const trackTabEntry = async (id: number, tabIndex: number): Promise<{ message: string }> => {
  const response = await axiosInstance.post<{ message: string }>(`/quick-checks/${id}/tab-entry`, {
    tabIndex
  });
  return response.data;
};

// Track tab exit
export const trackTabExit = async (id: number, tabIndex: number): Promise<{ message: string }> => {
  const response = await axiosInstance.post<{ message: string }>(`/quick-checks/${id}/tab-exit`, {
    tabIndex
  });
  return response.data;
};

// Get timing summary
export const getTimingSummary = async (id: number): Promise<{
  id: number;
  status: string;
  totalDuration: number;
  tabTimings: {
    info: { start: string; end: string; duration: number };
    pulling: { start: string; end: string; duration: number };
    underhood: { start: string; end: string; duration: number };
    tires: { start: string; end: string; duration: number };
  };
  durations: {
    createdToSubmitted: number;
    submittedToArchived: number;
    createdToArchived: number;
  };
  timestamps: {
    created: string;
    updated: string;
    archived: string | null;
  };
}> => {
  const response = await axiosInstance.get(`/quick-checks/${id}/timing`);
  return response.data;
};

// Chat management functions
export interface ChatConversation {
  id: number;
  user1_email: string;
  user1_name: string;
  user2_email: string;
  user2_name: string;
  other_user_email: string;
  other_user_name: string;
  last_message_at: string;
  created_at: string;
  message_count?: number;
  unread_count?: number;
  last_message?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_email: string;
  sender_name: string;
  receiver_email: string;
  receiver_name: string;
  message: string;
  message_type: 'text' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface ChatUser {
  email: string;
  name: string;
  role: string;
  enabled: boolean;
}

export const getChatConversations = async (): Promise<ChatConversation[]> => {
  const response = await axiosInstance.get<ChatConversation[]>('/chat/conversations');
  return response.data;
};

export const getChatUsers = async (): Promise<ChatUser[]> => {
  const response = await axiosInstance.get<ChatUser[]>('/chat/users');
  return response.data;
};

export const createOrGetConversation = async (otherUserEmail: string): Promise<ChatConversation> => {
  const response = await axiosInstance.post<ChatConversation>('/chat/conversations', {
    otherUserEmail
  });
  return response.data;
};

export const getChatMessages = async (conversationId: number): Promise<ChatMessage[]> => {
  const response = await axiosInstance.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
  return response.data;
};

export const sendChatMessage = async (conversationId: number, message: string): Promise<ChatMessage> => {
  const response = await axiosInstance.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
    message
  });
  return response.data;
};

export const deleteChatMessage = async (messageId: number): Promise<{ message: string }> => {
  const response = await axiosInstance.delete<{ message: string }>(`/chat/messages/${messageId}`);
  return response.data;
};

export const deleteChatConversation = async (conversationId: number): Promise<{ message: string }> => {
  const response = await axiosInstance.delete<{ message: string }>(`/chat/conversations/${conversationId}`);
  return response.data;
};

// Simple API object
export const api = {
  submitQuickCheck,
  getQuickCheckHistory,
  login,
  register,
  getQuickChecks,
  createQuickCheck,
  uploadQuickCheck,
  logout,
  deleteQuickCheck,
  deleteAllUsers,
  quickChecks: {
    getAll: getQuickChecks,
    getById: getQuickCheckById,
    create: createQuickCheck,
    upload: uploadQuickCheck,
    submit: submitQuickCheck,
    delete: deleteQuickCheck
  }
};

/**
 * Extract VIN from image using ChatGPT Vision API
 * @param imageData - Base64 encoded image data
 * @returns Extracted VIN or error message
 */
export const extractVinFromImage = async (imageData: string): Promise<{ success: boolean; vin?: string; message?: string }> => {
  try {
    console.log('🔍 Sending VIN extraction request...');
    console.log('📸 Image data length:', imageData.length);
    
    const response = await axiosInstance.post('/vin/extract-from-image', {
      imageData
    });
    
    console.log('✅ VIN extraction response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ VIN extraction error:', error);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to extract VIN from image'
    };
  }
};

export default api; 