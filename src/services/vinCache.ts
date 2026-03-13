interface VinCacheEntry {
  vin: string;
  decodedData: any;
  timestamp: number;
  failedAttempts: number;
}

interface VinCache {
  [vin: string]: VinCacheEntry;
}

class VinCacheService {
  private cache: VinCache = {};
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if decoded data has valid Year, Make, Model
   */
  private isValidDecodedData(data: any): boolean {
    if (!data || !data.Results || !Array.isArray(data.Results)) {
      return false;
    }

    const getValue = (variable: string): string => {
      const found = data.Results.find((r: any) => r.Variable === variable);
      return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
    };

    const year = getValue('Model Year');
    const make = getValue('Make');
    const model = getValue('Model');

    return !!(year && make && model);
  }

  /**
   * Check if we should make an API call for this VIN
   */
  shouldDecodeVin(vin: string): boolean {
    if (!vin || vin.length !== 17) {
      return false;
    }

    const cacheEntry = this.cache[vin];
    
    // No cache entry - need to decode
    if (!cacheEntry) {
      return true;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cacheEntry.timestamp > this.CACHE_DURATION) {
      // Cache expired - remove and decode again
      delete this.cache[vin];
      return true;
    }

    // If we have valid decoded data, don't decode again
    if (this.isValidDecodedData(cacheEntry.decodedData)) {
      return false;
    }

    // If we've failed too many times, don't try again
    if (cacheEntry.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      return false;
    }

    // Otherwise, try to decode
    return true;
  }

  /**
   * Get cached decoded data for a VIN
   */
  getCachedData(vin: string): any | null {
    const cacheEntry = this.cache[vin];
    
    if (!cacheEntry) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cacheEntry.timestamp > this.CACHE_DURATION) {
      delete this.cache[vin];
      return null;
    }

    return cacheEntry.decodedData;
  }

  /**
   * Cache successful decode result
   */
  setCachedData(vin: string, decodedData: any): void {
    this.cache[vin] = {
      vin,
      decodedData,
      timestamp: Date.now(),
      failedAttempts: 0
    };
  }

  /**
   * Increment failed attempts for a VIN
   */
  incrementFailedAttempts(vin: string): void {
    if (!this.cache[vin]) {
      this.cache[vin] = {
        vin,
        decodedData: null,
        timestamp: Date.now(),
        failedAttempts: 1
      };
    } else {
      this.cache[vin].failedAttempts++;
      this.cache[vin].timestamp = Date.now();
    }
  }

  /**
   * Clear cache for a specific VIN (when VIN is edited)
   */
  clearVinCache(vin: string): void {
    delete this.cache[vin];
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; validEntries: number; failedEntries: number } {
    const entries = Object.values(this.cache);
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(entry => this.isValidDecodedData(entry.decodedData)).length,
      failedEntries: entries.filter(entry => entry.failedAttempts >= this.MAX_FAILED_ATTEMPTS).length
    };
  }
}

// Export singleton instance
export const vinCacheService = new VinCacheService(); 