// Safari Debug Utility - Help identify login issues on Safari iPhone
// This will log detailed information to help debug Safari-specific problems

import { debug } from './debugManager';

interface DebugInfo {
  timestamp: string;
  userAgent: string;
  browser: string;
  storageType: string;
  cookiesEnabled: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  emailInput: string;
  emailNormalized: string;
  requestHeaders: any;
  errorDetails: any;
}

class SafariDebugger {
  private logs: DebugInfo[] = [];

  detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      if (ua.includes('iPhone') || ua.includes('iPad')) {
        return 'Safari iOS';
      }
      return 'Safari Desktop';
    }
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    return 'Unknown';
  }

  testStorage(): { localStorage: boolean; sessionStorage: boolean; cookiesEnabled: boolean } {
    let localStorage = false;
    let sessionStorage = false;
    let cookiesEnabled = false;

    // Test localStorage
    try {
      window.localStorage.setItem('__safari_test__', 'test');
      window.localStorage.removeItem('__safari_test__');
      localStorage = true;
    } catch (e) {
      console.warn('SafariDebug: localStorage blocked', e);
    }

    // Test sessionStorage
    try {
      window.sessionStorage.setItem('__safari_test__', 'test');
      window.sessionStorage.removeItem('__safari_test__');
      sessionStorage = true;
    } catch (e) {
      console.warn('SafariDebug: sessionStorage blocked', e);
    }

    // Test cookies
    try {
      document.cookie = '__safari_test__=test; path=/';
      cookiesEnabled = document.cookie.includes('__safari_test__=test');
      if (cookiesEnabled) {
        document.cookie = '__safari_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      }
    } catch (e) {
      console.warn('SafariDebug: cookies blocked', e);
    }

    return { localStorage, sessionStorage, cookiesEnabled };
  }

  logLoginAttempt(email: string, errorDetails?: any): DebugInfo {
    const storage = this.testStorage();
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      browser: this.detectBrowser(),
      storageType: storage.localStorage ? 'localStorage' : storage.sessionStorage ? 'sessionStorage' : 'none',
      cookiesEnabled: storage.cookiesEnabled,
      localStorage: storage.localStorage,
      sessionStorage: storage.sessionStorage,
      emailInput: email,
      emailNormalized: email.toLowerCase().trim(),
      requestHeaders: {
        'User-Agent': navigator.userAgent,
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      errorDetails: errorDetails
    };

    this.logs.push(debugInfo);
    
    // Enhanced logging for HTTPS issues
    debug.group('safari', 'Safari Login Debug');
    debug.log('safari', 'Browser:', debugInfo.browser);
    debug.log('safari', 'Protocol:', window.location.protocol);
    debug.log('safari', 'Frontend URL:', window.location.origin);
    debug.log('safari', 'API Base URL:', this.getApiUrl());
    debug.log('safari', 'Email Input:', `"${debugInfo.emailInput}"`);
    debug.log('safari', 'Email Normalized:', `"${debugInfo.emailNormalized}"`);
    debug.log('safari', 'Storage Available:', {
      localStorage: debugInfo.localStorage,
      sessionStorage: debugInfo.sessionStorage,
      cookies: debugInfo.cookiesEnabled
    });
    if (errorDetails) {
      debug.error('safari', 'Login Error:', errorDetails);
      if (errorDetails.message?.includes('Load failed') || errorDetails.message?.includes('NetworkError')) {
        debug.error('safari', 'HTTPS/Certificate Issue Detected:');
        debug.error('safari', '- Check if backend server is running on HTTPS');
        debug.error('safari', '- Verify SSL certificates are valid');
        debug.error('safari', '- Try accessing backend directly:', this.getApiUrl().replace('/api', ''));
      }
    }
    debug.groupEnd('safari');

    return debugInfo;
  }

  private getApiUrl(): string {
    // Use environment variable if set
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) return envUrl;
    
    // In development with localhost, use proxy
    if (import.meta.env.DEV && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    )) {
      return '/api';
    }
    
    const hostname = window.location.hostname;
    
    // Production: use api.autoflopro.com subdomain
    if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
      return 'https://api.autoflopro.com/api';
    }
    
    // For IP access, construct HTTPS URL
    if (import.meta.env.DEV) {
      return `https://${hostname}:5001/api`;
    }
    
    return '/api';
  }

  showVisualDebug(): string {
    const latest = this.logs[this.logs.length - 1];
    if (!latest) return 'No debug data available';

    return `
🐛 SAFARI DEBUG INFO
Browser: ${latest.browser}
Storage: ${latest.storageType}
localStorage: ${latest.localStorage ? '✅' : '❌'}
sessionStorage: ${latest.sessionStorage ? '✅' : '❌'}  
Cookies: ${latest.cookiesEnabled ? '✅' : '❌'}
Email: "${latest.emailInput}" → "${latest.emailNormalized}"
Time: ${latest.timestamp}
${latest.errorDetails ? `Error: ${JSON.stringify(latest.errorDetails, null, 2)}` : ''}
    `.trim();
  }

  getDebugReport(): DebugInfo[] {
    return [...this.logs];
  }

  // Create a visual alert for Safari users
  showSafariAlert(message: string): void {
    if (this.detectBrowser().includes('Safari')) {
      // Create a prominent alert for Safari users
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      alertDiv.innerHTML = `
        <strong>🦄 Safari Debug:</strong><br>
        ${message}
        <br><br>
        <button onclick="this.parentElement.remove()" style="background: white; color: #ff4444; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
          Close
        </button>
      `;
      document.body.appendChild(alertDiv);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      }, 10000);
    }
  }
}

// Create global instance
const safariDebugger = new SafariDebugger();

// Export functions
export const logLoginAttempt = (email: string, error?: any) => safariDebugger.logLoginAttempt(email, error);
export const showVisualDebug = () => safariDebugger.showVisualDebug();
export const getDebugReport = () => safariDebugger.getDebugReport();
export const showSafariAlert = (message: string) => safariDebugger.showSafariAlert(message);
export const detectBrowser = () => safariDebugger.detectBrowser();
export const testStorage = () => safariDebugger.testStorage();

export default safariDebugger; 