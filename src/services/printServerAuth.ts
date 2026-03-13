import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface PrintServerCredentials {
  email: string;
  password: string;
}

export interface PrintServerLoginResponse {
  token: string;
  email: string;
  role: string;
  userId: string;
  tokenType?: string;
  expiresIn?: number; // in seconds
}

export interface PrintServerTokenData {
  token: string;
  email: string;
  role: string;
  userId: string;
  tokenType: string;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

export interface PrintServerAuthConfig {
  serverUrl: string;
  verifySSL?: boolean;
  tokenFile?: string;
  timeout?: number;
}

export class PrintServerAuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PrintServerAuthError';
  }
}

export class PrintServerNetworkError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PrintServerNetworkError';
  }
}

export class PrintServerAuthClient {
  private serverUrl: string;
  private verifySSL: boolean;
  private tokenFile: string;
  private timeout: number;
  private axiosInstance: AxiosInstance;
  private tokenData: PrintServerTokenData | null = null;

  constructor(config: PrintServerAuthConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.verifySSL = config.verifySSL !== false; // Default to true
    this.tokenFile = config.tokenFile || '.token';
    this.timeout = config.timeout || 30000;

    // Create axios instance with browser-compatible configuration
    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: In browser environments, SSL verification is handled by the browser
      // For development with self-signed certificates, the user needs to accept the cert in browser
    });

    // Load existing token on initialization
    this.loadToken();
  }

  /**
   * Authenticate with the print server
   */
  async login(credentials: PrintServerCredentials, clearToken: boolean = false): Promise<PrintServerLoginResponse> {
    try {
      // Clear existing token if requested
      if (clearToken) {
        this.clearToken();
      }

      // Check if we already have a valid token
      if (!clearToken && this.isAuthenticated()) {
        console.log('🔄 Reusing valid token for print server authentication');
        return {
          token: this.tokenData!.token,
          email: this.tokenData!.email,
          role: this.tokenData!.role,
          userId: this.tokenData!.userId,
          tokenType: this.tokenData!.tokenType,
        };
      }

      console.log('🚀 Authenticating with print server:', this.serverUrl);
      
      const loginUrl = `${this.serverUrl}/api/login`;
      const response = await this.axiosInstance.post<PrintServerLoginResponse>(loginUrl, {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
      });

      if (response.status !== 200) {
        throw new PrintServerAuthError(`Login failed with status ${response.status}`);
      }

      const loginData = response.data;
      
      // Calculate expiration time
      const expiresIn = loginData.expiresIn || 3600; // Default 1 hour
      const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
      
      // Store token data
      this.tokenData = {
        token: loginData.token,
        email: loginData.email,
        role: loginData.role,
        userId: loginData.userId,
        tokenType: loginData.tokenType || 'Bearer',
        expiresAt,
        createdAt: new Date().toISOString(),
      };

      // Save to file
      this.saveToken();

      console.log('✅ Print server authentication successful for:', loginData.email);
      
      return loginData;

    } catch (error: any) {
      console.error('❌ Print server authentication failed:', error);

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new PrintServerNetworkError('Cannot connect to print server. Check the server URL and network connection.');
      }
      
      if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        throw new PrintServerNetworkError('SSL certificate error. You may need to set verifySSL to false for self-signed certificates.');
      }

      if (error.code === 'ECONNABORTED') {
        throw new PrintServerNetworkError('Request timeout. The print server may be unavailable.');
      }

      if (error.response?.status === 401) {
        throw new PrintServerAuthError('Invalid email or password');
      }

      if (error.response?.status === 429) {
        throw new PrintServerAuthError('Too many login attempts. Please try again later.');
      }

      if (error.response?.status >= 500) {
        throw new PrintServerNetworkError(`Print server error: ${error.response.status}`);
      }

      throw new PrintServerAuthError(error.message || 'Authentication failed');
    }
  }

  /**
   * Check if user is authenticated with a valid token
   */
  isAuthenticated(): boolean {
    if (!this.tokenData) {
      return false;
    }

    // Check if token is expired
    const expiresAt = new Date(this.tokenData.expiresAt);
    const now = new Date();
    
    if (now >= expiresAt) {
      console.log('🔐 Print server token expired');
      this.clearToken();
      return false;
    }

    return true;
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.tokenData!.token;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      return {};
    }

    const tokenType = this.tokenData?.tokenType || 'Bearer';
    return {
      'Authorization': `${tokenType} ${token}`
    };
  }

  /**
   * Get user information from stored token data
   */
  getUserInfo(): Omit<PrintServerTokenData, 'token'> | null {
    if (!this.tokenData) {
      return null;
    }

    const { token, ...userInfo } = this.tokenData;
    return userInfo;
  }

  /**
   * Make an authenticated request to the print server
   */
  async makeAuthenticatedRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.isAuthenticated()) {
      throw new PrintServerAuthError('Not authenticated. Please login first.');
    }

    const url = `${this.serverUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...config?.headers,
    };

    try {
      const response = await this.axiosInstance.request<T>({
        method,
        url,
        ...config,
        headers,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('🔐 Print server token expired during request');
        this.clearToken();
        throw new PrintServerAuthError('Authentication token expired. Please login again.');
      }
      
      throw error;
    }
  }

  /**
   * Clear stored token and logout
   */
  clearToken(): void {
    this.tokenData = null;
    
    // Remove token file
    if (typeof window !== 'undefined') {
      // Browser environment - use localStorage as fallback
      try {
        localStorage.removeItem(`printServerToken_${this.serverUrl}`);
      } catch (e) {
        console.warn('Could not clear token from localStorage:', e);
      }
    } else {
      // Node.js environment - remove file
      try {
        const fs = require('fs');
        if (fs.existsSync(this.tokenFile)) {
          fs.unlinkSync(this.tokenFile);
        }
      } catch (e) {
        console.warn('Could not remove token file:', e);
      }
    }

    console.log('🔐 Print server token cleared');
  }

  /**
   * Load token from storage
   */
  private loadToken(): void {
    try {
      if (typeof window !== 'undefined') {
        // Browser environment - use localStorage
        const stored = localStorage.getItem(`printServerToken_${this.serverUrl}`);
        if (stored) {
          this.tokenData = JSON.parse(stored);
        }
      } else {
        // Node.js environment - read from file
        const fs = require('fs');
        if (fs.existsSync(this.tokenFile)) {
          const data = fs.readFileSync(this.tokenFile, 'utf8');
          this.tokenData = JSON.parse(data);
        }
      }

      // Validate loaded token
      if (this.tokenData && !this.isValidTokenData(this.tokenData)) {
        console.warn('Invalid token data found, clearing...');
        this.clearToken();
      }
    } catch (error) {
      console.warn('Could not load token from storage:', error);
      this.tokenData = null;
    }
  }

  /**
   * Save token to storage
   */
  private saveToken(): void {
    if (!this.tokenData) {
      return;
    }

    try {
      const tokenJson = JSON.stringify(this.tokenData, null, 2);

      if (typeof window !== 'undefined') {
        // Browser environment - use localStorage
        localStorage.setItem(`printServerToken_${this.serverUrl}`, tokenJson);
      } else {
        // Node.js environment - save to file
        const fs = require('fs');
        fs.writeFileSync(this.tokenFile, tokenJson, { mode: 0o600 }); // Secure file permissions
      }

      console.log('💾 Print server token saved');
    } catch (error) {
      console.error('Could not save token to storage:', error);
    }
  }

  /**
   * Validate token data structure
   */
  private isValidTokenData(data: any): data is PrintServerTokenData {
    return (
      data &&
      typeof data.token === 'string' &&
      typeof data.email === 'string' &&
      typeof data.role === 'string' &&
      typeof data.userId === 'string' &&
      typeof data.tokenType === 'string' &&
      typeof data.expiresAt === 'string' &&
      typeof data.createdAt === 'string'
    );
  }

  /**
   * Get token expiration info
   */
  getTokenInfo(): {
    isValid: boolean;
    expiresAt: Date | null;
    timeUntilExpiration: number | null; // in milliseconds
  } {
    if (!this.tokenData) {
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiration: null,
      };
    }

    const expiresAt = new Date(this.tokenData.expiresAt);
    const now = new Date();
    const timeUntilExpiration = expiresAt.getTime() - now.getTime();

    return {
      isValid: timeUntilExpiration > 0,
      expiresAt,
      timeUntilExpiration: timeUntilExpiration > 0 ? timeUntilExpiration : null,
    };
  }
}

// Factory function for easy instantiation
export function createPrintServerAuthClient(config: PrintServerAuthConfig): PrintServerAuthClient {
  return new PrintServerAuthClient(config);
}

// Default export
export default PrintServerAuthClient; 