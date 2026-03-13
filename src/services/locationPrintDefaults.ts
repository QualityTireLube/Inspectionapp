import axios from 'axios';
import { getToken as authGetToken, isExpired as authIsExpired, logout as authLogout, scheduleAutoLogout as authSchedule } from '../auth';

// Get base URL for API
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  const hostname = window.location.hostname;
  
  // Production: use api.autoflopro.com subdomain
  if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
    return 'https://api.autoflopro.com';
  }
  
  // For print API, always use the backend server port (5001)
  const protocol = window.location.protocol;
  
  return `${protocol}//${hostname}:5001`;
};

const API_BASE = getBaseUrl();

// Determine the print API base URL
const getPrintApiBase = () => {
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}/print`;
  }
  return `${API_BASE}/api/print`;
};

// Create axios instance
const printApi = axios.create({
  baseURL: getPrintApiBase(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Use main app's authentication
printApi.interceptors.request.use((config) => {
  const token = authGetToken();
  if (!token || authIsExpired(token)) {
    authLogout();
    return Promise.reject(new Error('Auth token missing/expired'));
  }
  authSchedule(token);
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle response errors
printApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Location Print Defaults API Error:', error);
    if (error.response?.status === 401) {
      authLogout();
    }
    return Promise.reject(error);
  }
);

// Types
export interface LocationPrintDefault {
  id: string;
  locationId: string;
  settingType: 'stickers' | 'labels';
  printMethod: 'pdf' | 'queue' | 'queue-fallback';
  printerId: string | null;
  printClientId: string | null;
  orientation: 'portrait' | 'landscape';
  autoPrint: boolean;
  autoCut: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  alreadyExisted?: boolean;
}

export interface LocationPrintDefaults {
  stickers: LocationPrintDefault | null;
  labels: LocationPrintDefault | null;
}

export interface SetLocationPrintDefaultRequest {
  printMethod?: 'pdf' | 'queue' | 'queue-fallback';
  printerId?: string;
  printClientId?: string;
  orientation?: 'portrait' | 'landscape';
  autoPrint?: boolean;
  autoCut?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Service for managing location-level print defaults
 * These are the default printer settings for a location that apply to all users
 * unless they have explicitly overridden them with their own settings.
 */
export class LocationPrintDefaultsService {
  
  /**
   * Get print defaults for a specific location
   * Returns both stickers and labels defaults (or null if not set)
   */
  static async getLocationDefaults(locationId: string): Promise<LocationPrintDefaults> {
    try {
      const response = await printApi.get(`/locations/${locationId}/print-defaults`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get location print defaults:', error);
      // Return empty defaults on error to allow graceful fallback
      return {
        stickers: null,
        labels: null
      };
    }
  }
  
  /**
   * Set a location print default (only creates if not exists - first wins)
   * This is used when the first print client registers for a location
   */
  static async setLocationDefault(
    locationId: string,
    settingType: 'stickers' | 'labels',
    settings: SetLocationPrintDefaultRequest
  ): Promise<LocationPrintDefault | null> {
    try {
      const response = await printApi.put(
        `/locations/${locationId}/print-defaults/${settingType}`,
        settings
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to set location print default for ${settingType}:`, error);
      return null;
    }
  }
  
  /**
   * Force update a location print default (admin override)
   * This will overwrite any existing default
   */
  static async forceUpdateLocationDefault(
    locationId: string,
    settingType: 'stickers' | 'labels',
    settings: SetLocationPrintDefaultRequest
  ): Promise<LocationPrintDefault | null> {
    try {
      const response = await printApi.put(
        `/locations/${locationId}/print-defaults/${settingType}/force`,
        settings
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to force update location print default for ${settingType}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a location print default
   */
  static async deleteLocationDefault(
    locationId: string,
    settingType: 'stickers' | 'labels'
  ): Promise<boolean> {
    try {
      await printApi.delete(`/locations/${locationId}/print-defaults/${settingType}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to delete location print default for ${settingType}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a location has any print defaults configured
   */
  static async hasLocationDefaults(locationId: string): Promise<boolean> {
    const defaults = await this.getLocationDefaults(locationId);
    return defaults.stickers !== null || defaults.labels !== null;
  }
  
  /**
   * Resolve print settings with hierarchy:
   * 1. User settings (if isUserOverride is true)
   * 2. Location defaults
   * 3. System defaults (PDF method)
   */
  static resolveSettings(
    userSettings: any,
    locationDefaults: LocationPrintDefault | null,
    settingType: 'stickers' | 'labels'
  ): {
    printMethod: 'pdf' | 'queue' | 'queue-fallback';
    printerId: string;
    orientation: 'portrait' | 'landscape';
    autoPrint: boolean;
    autoCut: boolean;
    source: 'user' | 'location' | 'system';
  } {
    // Check if user has explicitly overridden settings
    const userSettingsKey = settingType === 'stickers' ? 'stickerPrintSettings' : 'labelPrintSettings';
    const userPrintSettings = userSettings?.[userSettingsKey];
    
    if (userPrintSettings?.isUserOverride) {
      // User has explicitly set their preferences
      return {
        printMethod: userPrintSettings.printMethod || 'pdf',
        printerId: userPrintSettings.printerId || '',
        orientation: userPrintSettings.orientation || 'portrait',
        autoPrint: userPrintSettings.autoPrint || false,
        autoCut: userPrintSettings.autoCut !== false,
        source: 'user'
      };
    }
    
    // Use location defaults if available
    if (locationDefaults) {
      return {
        printMethod: locationDefaults.printMethod || 'pdf',
        printerId: locationDefaults.printerId || '',
        orientation: locationDefaults.orientation || 'portrait',
        autoPrint: locationDefaults.autoPrint || false,
        autoCut: locationDefaults.autoCut !== false,
        source: 'location'
      };
    }
    
    // Fall back to system defaults
    return {
      printMethod: 'pdf',
      printerId: '',
      orientation: 'portrait',
      autoPrint: false,
      autoCut: true,
      source: 'system'
    };
  }
}

export default LocationPrintDefaultsService;
