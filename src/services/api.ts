import axios, { AxiosInstance } from 'axios';
import { getToken, isTokenExpired, logout } from '../auth';
import { debug } from './debugManager';

/**
 * Get the API server base URL (without /api suffix)
 * In production (autoflopro.com or Amplify), uses api.autoflopro.com subdomain
 * In development, uses hostname:5001
 */
export const getApiServerUrl = (): string => {
  const hostname = window.location.hostname;

  // Any production deployment routes to the real API server
  if (
    hostname === 'autoflopro.com' ||
    hostname === 'www.autoflopro.com' ||
    hostname.endsWith('.amplifyapp.com') ||
    hostname.endsWith('.autoflopro.com')
  ) {
    return 'https://api.autoflopro.com';
  }

  // Local development: use port 5001
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${hostname}:5001`;
};

/**
 * Get the full API base URL (with /api suffix)
 */
export const getApiBaseUrl = (): string => {
  return `${getApiServerUrl()}/api`;
};

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
  decoded_vin_data?: any; // Full JSON from NHTSA/VIN decoding service
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
  battery_positive_terminal_photos?: { url: string }[];
  battery_negative_terminal_photos?: { url: string }[];
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
  tpms_sensor_types?: {
    driver_front: string;
    passenger_front: string;
    driver_rear_outer: string;
    driver_rear_inner: string;
    passenger_rear_inner: string;
    passenger_rear_outer: string;
    spare: string;
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
  
  const hostname = window.location.hostname;

  // Any production deployment routes to the real API server
  if (
    hostname === 'autoflopro.com' ||
    hostname === 'www.autoflopro.com' ||
    hostname.endsWith('.amplifyapp.com') ||
    hostname.endsWith('.autoflopro.com')
  ) {
    const productionUrl = 'https://api.autoflopro.com/api';
    debug.log('api', 'Using production API URL:', productionUrl);
    return productionUrl;
  }

  // Local development: direct connection on port 5001
  const backendUrl = `https://${hostname}:5001/api`;
  debug.log('api', 'Using dev API URL:', backendUrl);
  return backendUrl;
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
  
  const hostname = window.location.hostname;

  // Any production deployment routes to the real API server
  if (
    hostname === 'autoflopro.com' ||
    hostname === 'www.autoflopro.com' ||
    hostname.endsWith('.amplifyapp.com') ||
    hostname.endsWith('.autoflopro.com')
  ) {
    const baseUrl = 'https://api.autoflopro.com';
    console.log('🔒 Using production upload URL:', `${baseUrl}${relativePath}`);
    return `${baseUrl}${relativePath}`;
  }
  
  // Convert relative path to absolute HTTPS backend URL
  const protocol = 'https'; // Always use HTTPS
  const baseUrl = `${protocol}://${hostname}:5001`;
  
  console.log('🔒 Using HTTPS upload URL:', `${baseUrl}${relativePath}`);
  return `${baseUrl}${relativePath}`;
};

// Enhanced axios instance with HTTPS enforcement
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disable credentials for Safari compatibility
  timeout: 20000, // Increased timeout for HTTPS
  // Additional HTTPS-specific configurations
  httpsAgent: undefined, // Let browser handle HTTPS
});

// Request interceptor with new auth functions
axiosInstance.interceptors.request.use(
  (config) => {
    const url = (config.url || '').toString();
    const isPublic = url.endsWith('/login') || url.endsWith('/register') || url.endsWith('/health');
    if (!isPublic) {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        // No legacy JWT — reject silently. Firebase manages auth; components
        // handle the error and show empty states. Never force a page redirect
        // here because the user may already be authenticated via Firebase.
        return Promise.reject(new Error('Auth token missing/expired'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.baseURL && config.baseURL.startsWith('http://')) {
      config.baseURL = config.baseURL.replace('http://', 'https://');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with new auth functions
axiosInstance.interceptors.response.use(
  (response) => {
    debug.log('api', 'API Response received:', { status: response.status, url: response.config?.url });
    return response;
  },
  (error) => Promise.reject(error)
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
    
    // Token will be set by the calling component
    
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

export const register = async (email: string, password: string, name: string, pin: string, location?: string): Promise<{ message: string }> => {
  const requestData: { email: string; password: string; name: string; pin: string; location?: string } = { email, password, name, pin };
  if (location) {
    requestData.location = location;
  }
  const response = await axiosInstance.post<{ message: string }>('/register', requestData);
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

export const getActiveQuickChecks = async (locationFilter?: string): Promise<QuickCheck[]> => {
  console.log('getActiveQuickChecks called, baseURL:', getBaseUrl(), 'location:', locationFilter); // Debug log
  const params = locationFilter ? { location: locationFilter } : {};
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/active', { params });
  console.log('getActiveQuickChecks response:', response); // Debug log
  return response.data;
};

export const getArchivedQuickChecks = async (): Promise<QuickCheck[]> => {
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/archived');
  return response.data;
};

export const getInProgressQuickChecks = async (locationFilter?: string): Promise<QuickCheck[]> => {
  console.log('getInProgressQuickChecks called, baseURL:', getBaseUrl(), 'location:', locationFilter); // Debug log
  const params = locationFilter ? { location: locationFilter } : {};
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/in-progress', { params });
  console.log('getInProgressQuickChecks response:', response); // Debug log
  return response.data;
};

export const getSubmittedQuickChecks = async (locationFilter?: string): Promise<QuickCheck[]> => {
  console.log('getSubmittedQuickChecks called, baseURL:', getBaseUrl(), 'location:', locationFilter); // Debug log
  const params = locationFilter ? { location: locationFilter } : {};
  const response = await axiosInstance.get<QuickCheck[]>('/quick-checks/submitted', { params });
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

export const updateProfile = async (name: string, email: string, pin?: string, location?: string): Promise<{ message: string }> => {
  const requestData: { name: string; email: string; pin?: string; location?: string } = { name, email };
  if (pin !== undefined) {
    requestData.pin = pin;
  }
  if (location !== undefined) {
    requestData.location = location;
  }
  const response = await axiosInstance.put<{ message: string }>('/profile', requestData);
  return response.data;
};

export const getUserProfile = async (): Promise<{ name: string; email: string; role: string; pin?: string; location?: string }> => {
  const response = await axiosInstance.get<{ name: string; email: string; role: string; pin?: string; location?: string }>('/profile');
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

export const updateUserLocation = async (email: string, location: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/users/${email}/location`, { location });
  return response.data;
};

export const updateUserDetails = async (email: string, details: {
  name?: string;
  newEmail?: string;
  role?: string;
  location?: string;
  pin?: string;
}): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/users/${email}`, details);
  return response.data;
};

export const lookupUserByPin = async (pin: string): Promise<{ email: string; name: string; role: string }> => {
  const response = await axiosInstance.post<{ email: string; name: string; role: string }>('/users/lookup-by-pin', { pin });
  return response.data;
};

// Roles management
export interface UserRole {
  id: string;
  name: string;
  visiblePages: string[];
  homePageId?: string;
}

export const getRoles = async (): Promise<UserRole[]> => {
  const response = await axiosInstance.get<UserRole[]>('/roles');
  return response.data;
};

export const getRolePages = async (): Promise<string[]> => {
  const response = await axiosInstance.get<string[]>('/roles/pages');
  return response.data;
};

export const createRole = async (name: string, visiblePages: string[], homePageId?: string): Promise<UserRole> => {
  const payload: any = { name, visiblePages };
  if (homePageId !== undefined) payload.homePageId = homePageId;
  const response = await axiosInstance.post<UserRole>('/roles', payload);
  return response.data;
};

export const updateRole = async (id: string, updates: Partial<Pick<UserRole, 'name' | 'visiblePages' | 'homePageId'>>): Promise<UserRole> => {
  const response = await axiosInstance.put<UserRole>(`/roles/${id}`, updates);
  return response.data;
};

export const deleteRole = async (id: string): Promise<{ success: boolean } | { message: string }> => {
  const response = await axiosInstance.delete<{ success: boolean } | { message: string }>(`/roles/${id}`);
  return response.data;
};

export const logoutApi = async (): Promise<void> => {
  logout();
};

// Re-export logout function for backward compatibility
export { logout } from '../auth';

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

// User settings (per-user, server-backed)
export const getUserSettings = async (): Promise<any> => {
  const response = await axiosInstance.get('/user-settings');
  return response.data;
};

export const updateUserSettings = async (settings: any): Promise<{ message: string; settings: any }> => {
  const response = await axiosInstance.put('/user-settings', settings);
  return response.data;
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
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      logout();
      throw new Error('Authentication required');
    }
    const response = await fetch(`${getBaseUrl()}/quick-checks/${quickCheckId}/photos/${field}/${position}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
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


// Simple API object
export const api = {
  submitQuickCheck,
  getQuickCheckHistory,
  login,
  register,
  getQuickChecks,
  createQuickCheck,
  uploadQuickCheck,
  logout: logoutApi,
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

// Create a dedicated API instance for the requirements
export const createApiInstance = () => {
  const apiInstance = axios.create({
    // Use the same logic as axiosInstance to ensure HTTPS and correct dev port
    baseURL: getBaseUrl(),
    withCredentials: false,
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
  });

  apiInstance.interceptors.request.use((config) => {
    const url = (config.url || '').toString();
    const isPublic = url.endsWith('/login') || url.endsWith('/register') || url.endsWith('/health');
    const token = getToken();
    if (!isPublic) {
      if (!token || isTokenExpired(token)) {
        return Promise.reject(new Error('Auth token missing/expired'));
      }
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiInstance.interceptors.response.use(
    (res) => res,
    (error) => Promise.reject(error)
  );

  return apiInstance;
};

// Export the new API instance as the main one
export const mainApi = createApiInstance();

// Login function using the new API instance
export const loginWithNewApi = async (email: string, password: string) => {
  const { data } = await mainApi.post('/auth/login', { email, password });
  // support both {data:{token,user}} and flat
  const payload = data?.data ?? data;
  return {
    token: payload.token,
    email: payload.user.email,
    name: payload.user.name,
    role: payload.user.role,
    userId: payload.user.id,
  };
};

export default api; 