import { getItem, removeItem } from './safariStorage';

interface TokenPayload {
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

class TokenManager {
  private static instance: TokenManager;
  private expirationCheckInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // Check every minute

  private constructor() {
    this.startExpirationCheck();
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Decode JWT token and extract payload
   */
  private decodeToken(token: string): TokenPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    
    if (isExpired) {
      console.log('🔐 Token expired:', new Date(payload.exp * 1000));
    }
    
    return isExpired;
  }

  /**
   * Get time until token expires (in seconds)
   */
  public getTimeUntilExpiration(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  public isTokenExpiringSoon(token: string): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration(token);
    return timeUntilExpiration > 0 && timeUntilExpiration < 300; // 5 minutes
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    console.log('🗑️ Clearing authentication data due to token expiration');
    
    // Clear from localStorage
    removeItem('token');
    removeItem('userName');
    removeItem('userEmail');
    removeItem('userRole');
    removeItem('userId');
    
    // Also clear from sessionStorage as fallback
    try {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userName');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('userId');
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }

  /**
   * Handle token expiration
   */
  private handleTokenExpiration(): void {
    console.log('⏰ Token expired - logging out user');
    
    // Clear authentication data
    this.clearAuthData();
    
    // Show notification to user
    this.showExpirationNotification();
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expired=true';
    }
  }

  /**
   * Show notification about token expiration
   */
  private showExpirationNotification(): void {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 16px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 300px;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Session Expired</div>
      <div>Your session has expired. Please log in again.</div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Start periodic token expiration check
   */
  private startExpirationCheck(): void {
    // Clear existing interval
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
    }

    // Set up new interval
    this.expirationCheckInterval = setInterval(() => {
      const token = getItem('token');
      
      if (token) {
        if (this.isTokenExpired(token)) {
          this.handleTokenExpiration();
        } else if (this.isTokenExpiringSoon(token)) {
          console.log('⚠️ Token expiring soon:', this.getTimeUntilExpiration(token), 'seconds remaining');
          this.showExpirationWarning();
        }
      }
    }, this.CHECK_INTERVAL);

    console.log('⏰ Token expiration check started (checking every minute)');
  }

  /**
   * Show warning about token expiring soon
   */
  private showExpirationWarning(): void {
    const token = getItem('token');
    if (!token) return;

    const timeUntilExpiration = this.getTimeUntilExpiration(token);
    const minutes = Math.ceil(timeUntilExpiration / 60);
    
    // Only show warning once per session
    if (sessionStorage.getItem('expirationWarningShown')) {
      return;
    }
    
    sessionStorage.setItem('expirationWarningShown', 'true');
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 16px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 300px;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Session Expiring Soon</div>
      <div>Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}. Please save your work.</div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  /**
   * Stop expiration check
   */
  public stopExpirationCheck(): void {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
      this.expirationCheckInterval = null;
      console.log('⏰ Token expiration check stopped');
    }
  }

  /**
   * Get token info for debugging
   */
  public getTokenInfo(token: string): { isValid: boolean; expiresAt: Date | null; timeUntilExpiration: number } {
    const payload = this.decodeToken(token);
    if (!payload) {
      return { isValid: false, expiresAt: null, timeUntilExpiration: 0 };
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiration = Math.max(0, payload.exp - currentTime);
    
    return {
      isValid: payload.exp > currentTime,
      expiresAt: new Date(payload.exp * 1000),
      timeUntilExpiration
    };
  }

  /**
   * Cleanup on logout
   */
  public cleanup(): void {
    this.stopExpirationCheck();
    sessionStorage.removeItem('expirationWarningShown');
  }
}

export const tokenManager = TokenManager.getInstance();
export default tokenManager; 