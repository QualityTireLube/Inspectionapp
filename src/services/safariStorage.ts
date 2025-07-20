// Safari-compatible storage utility
// Handles localStorage restrictions in Safari (private browsing, ITP, etc.)

interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class SafariStorage implements StorageInterface {
  private fallbackStorage: Map<string, string> = new Map();
  private storageType: 'localStorage' | 'sessionStorage' | 'memory' = 'memory';

  constructor() {
    this.detectBestStorage();
  }

  private detectBestStorage(): void {
    // Test localStorage first
    try {
      const testKey = '__safari_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.storageType = 'localStorage';
      console.log('✅ Using localStorage');
      return;
    } catch (e) {
      console.warn('localStorage blocked:', e);
    }

    // Test sessionStorage as fallback
    try {
      const testKey = '__safari_storage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      this.storageType = 'sessionStorage';
      console.log('✅ Using sessionStorage (localStorage blocked)');
      return;
    } catch (e) {
      console.warn('sessionStorage also blocked:', e);
    }

    // Use memory storage as last resort
    this.storageType = 'memory';
    console.warn('⚠️  Using memory storage (both localStorage and sessionStorage blocked)');
  }

  getItem(key: string): string | null {
    try {
      switch (this.storageType) {
        case 'localStorage':
          return localStorage.getItem(key);
        case 'sessionStorage':
          return sessionStorage.getItem(key);
        case 'memory':
          return this.fallbackStorage.get(key) || null;
        default:
          return null;
      }
    } catch (e) {
      console.error(`Error getting item ${key}:`, e);
      return this.fallbackStorage.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      // Always store in fallback memory as backup
      this.fallbackStorage.set(key, value);

      switch (this.storageType) {
        case 'localStorage':
          localStorage.setItem(key, value);
          break;
        case 'sessionStorage':
          sessionStorage.setItem(key, value);
          break;
        case 'memory':
          // Already stored in fallbackStorage
          break;
      }
    } catch (e) {
      console.error(`Error setting item ${key}:`, e);
      // Fallback is already set above
    }
  }

  removeItem(key: string): void {
    try {
      this.fallbackStorage.delete(key);

      switch (this.storageType) {
        case 'localStorage':
          localStorage.removeItem(key);
          break;
        case 'sessionStorage':
          sessionStorage.removeItem(key);
          break;
        case 'memory':
          // Already removed from fallbackStorage
          break;
      }
    } catch (e) {
      console.error(`Error removing item ${key}:`, e);
    }
  }

  clear(): void {
    try {
      this.fallbackStorage.clear();

      switch (this.storageType) {
        case 'localStorage':
          localStorage.clear();
          break;
        case 'sessionStorage':
          sessionStorage.clear();
          break;
        case 'memory':
          // Already cleared fallbackStorage
          break;
      }
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
  }

  // Check if storage is available and working
  isAvailable(): boolean {
    return this.storageType !== 'memory';
  }

  // Get current storage type
  getStorageType(): string {
    return this.storageType;
  }

  // Check if we're in Safari private browsing
  isPrivateBrowsing(): boolean {
    return this.storageType === 'memory' || this.storageType === 'sessionStorage';
  }

  // Show user-friendly message about storage limitations
  getStorageMessage(): string | null {
    switch (this.storageType) {
      case 'localStorage':
        return null; // All good
      case 'sessionStorage':
        return 'Note: You\'re using private browsing. You\'ll need to sign in again if you close this tab.';
      case 'memory':
        return 'Note: Browser storage is disabled. You\'ll need to sign in again if you refresh the page.';
      default:
        return null;
    }
  }
}

// Create singleton instance
const safariStorage = new SafariStorage();

// Export convenience functions
export const getItem = (key: string): string | null => safariStorage.getItem(key);
export const setItem = (key: string, value: string): void => safariStorage.setItem(key, value);
export const removeItem = (key: string): void => safariStorage.removeItem(key);
export const clear = (): void => safariStorage.clear();
export const isStorageAvailable = (): boolean => safariStorage.isAvailable();
export const getStorageType = (): string => safariStorage.getStorageType();
export const isPrivateBrowsing = (): boolean => safariStorage.isPrivateBrowsing();
export const getStorageMessage = (): string | null => safariStorage.getStorageMessage();

export default safariStorage; 