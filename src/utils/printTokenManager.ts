import fs from 'fs';
import path from 'path';

export interface SavedTokenData {
  token: string;
  email: string;
  role: string;
  userId: string;
  tokenType: string;
  expiresAt: string;
  createdAt: string;
  serverUrl: string;
}

export interface TokenStatus {
  isValid: boolean;
  isExpired: boolean;
  timeUntilExpiration: number | null;
  userInfo: {
    email: string;
    role: string;
    userId: string;
  } | null;
}

export class PrintTokenManager {
  private tokenFilePath: string;
  private tokenData: SavedTokenData | null = null;

  constructor(tokenFilePath: string = 'print-server-token.json') {
    this.tokenFilePath = path.resolve(tokenFilePath);
    this.loadToken();
  }

  /**
   * Load token from file
   */
  private loadToken(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const data = fs.readFileSync(this.tokenFilePath, 'utf8');
        this.tokenData = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load print server token:', error);
      this.tokenData = null;
    }
  }

  /**
   * Get current token status
   */
  getTokenStatus(): TokenStatus {
    if (!this.tokenData) {
      return {
        isValid: false,
        isExpired: true,
        timeUntilExpiration: null,
        userInfo: null
      };
    }

    const expiresAt = new Date(this.tokenData.expiresAt);
    const now = new Date();
    const timeUntilExpiration = expiresAt.getTime() - now.getTime();
    const isExpired = timeUntilExpiration <= 0;

    return {
      isValid: !isExpired,
      isExpired,
      timeUntilExpiration: isExpired ? null : timeUntilExpiration,
      userInfo: isExpired ? null : {
        email: this.tokenData.email,
        role: this.tokenData.role,
        userId: this.tokenData.userId
      }
    };
  }

  /**
   * Get current token for API requests
   */
  getToken(): string | null {
    const status = this.getTokenStatus();
    return status.isValid ? this.tokenData!.token : null;
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (!token || !this.tokenData) {
      return {};
    }

    return {
      'Authorization': `${this.tokenData.tokenType} ${token}`
    };
  }

  /**
   * Get user information
   */
  getUserInfo(): {
    email: string;
    role: string;
    userId: string;
    serverUrl: string;
  } | null {
    const status = this.getTokenStatus();
    if (!status.isValid || !this.tokenData) {
      return null;
    }

    return {
      email: this.tokenData.email,
      role: this.tokenData.role,
      userId: this.tokenData.userId,
      serverUrl: this.tokenData.serverUrl
    };
  }

  /**
   * Check if token exists and is valid
   */
  isAuthenticated(): boolean {
    return this.getTokenStatus().isValid;
  }

  /**
   * Clear token (logout)
   */
  clearToken(): void {
    this.tokenData = null;
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
      }
    } catch (error) {
      console.warn('Failed to delete token file:', error);
    }
  }

  /**
   * Reload token from file (useful if token was updated externally)
   */
  reloadToken(): void {
    this.loadToken();
  }

  /**
   * Get token file path
   */
  getTokenFilePath(): string {
    return this.tokenFilePath;
  }

  /**
   * Get time until token expiration in a human-readable format
   */
  getExpirationText(): string {
    const status = this.getTokenStatus();
    
    if (!status.isValid) {
      return 'No valid token';
    }

    if (status.timeUntilExpiration === null) {
      return 'Expired';
    }

    const milliseconds = status.timeUntilExpiration;
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  }

  /**
   * Save new token data (typically called after generating a new token)
   */
  saveToken(tokenData: SavedTokenData): void {
    try {
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
      this.tokenData = tokenData;
    } catch (error) {
      throw new Error(`Failed to save token: ${error}`);
    }
  }

  /**
   * Static method to check if a token file exists
   */
  static tokenFileExists(filePath: string = 'print-server-token.json'): boolean {
    return fs.existsSync(path.resolve(filePath));
  }

  /**
   * Static method to quickly check if a valid token exists
   */
  static hasValidToken(filePath: string = 'print-server-token.json'): boolean {
    const manager = new PrintTokenManager(filePath);
    return manager.isAuthenticated();
  }
}

// Create a default instance for easy use
export const defaultPrintTokenManager = new PrintTokenManager();

// Helper functions for common operations
export function getPrintToken(): string | null {
  return defaultPrintTokenManager.getToken();
}

export function getPrintAuthHeader(): Record<string, string> {
  return defaultPrintTokenManager.getAuthHeader();
}

export function isPrintServerAuthenticated(): boolean {
  return defaultPrintTokenManager.isAuthenticated();
}

export function getPrintUserInfo() {
  return defaultPrintTokenManager.getUserInfo();
}

export function clearPrintToken(): void {
  defaultPrintTokenManager.clearToken();
}

export default PrintTokenManager; 