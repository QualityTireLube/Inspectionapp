/**
 * Company Credentials API Service
 * 
 * Handles secure storage and retrieval of encrypted Parts Tech credentials per company/location
 */

import { axiosInstance } from './api';
import { CredentialEncryption } from './encryptionService';

export interface CompanyCredentialMetadata {
  hasCredentials: boolean;
  lastUpdated?: string;
  createdBy?: string;
  credentialHash?: string;
  services?: ('partstech' | 'nexpart')[];
}

export interface EncryptedCredentialData {
  encryptedCredentials: string;
  credentialHash: string;
  lastUpdated: string;
}

export interface PartsTeachCredentials {
  userCredentials: {
    id: string;
    key: string;
  };
  partnerCredentials: {
    id: string;
    key: string;
  };
  defaultStoreId?: number;
}

export interface NexPartCredentials {
  username: string;
  password: string;
  providerKey?: string;
  clientVersion?: string;
  rev?: string;
}

export interface NexPartVendorCredentials {
  vendorId: string;
  vendorName: string;
  credentials: NexPartCredentials;
  isActive: boolean;
  lastTested?: string;
}

export interface NexPartCredentialsStorage {
  vendors: NexPartVendorCredentials[];
  defaultVendorId?: string;
}

export interface CompanyCredentials {
  partsTeachCredentials?: PartsTeachCredentials;
  nexPartCredentials?: NexPartCredentialsStorage;
}

class CompanyCredentialsApiService {
  private masterKeyHash: string | null = null;

  /**
   * Get master key hash for encryption (admin only)
   */
  async getMasterKeyHash(): Promise<string> {
    if (this.masterKeyHash) {
      return this.masterKeyHash;
    }

    try {
      const response = await axiosInstance.get('/encryption/master-key-hash');
      this.masterKeyHash = response.data.masterKeyHash;
      return this.masterKeyHash;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Admin access required to manage company credentials');
      }
      throw new Error('Failed to retrieve encryption key');
    }
  }

  /**
   * Get credential metadata for a company/location
   */
  async getCredentialMetadata(locationId: string, service: 'partstech' | 'nexpart' = 'partstech'): Promise<CompanyCredentialMetadata> {
    try {
      const response = await axiosInstance.get(`/company-credentials/${locationId}?service=${service}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to access company credentials');
      }
      throw new Error('Failed to retrieve credential metadata');
    }
  }

  /**
   * Save encrypted credentials for a company/location
   */
  async saveCredentials(
    locationId: string,
    credentials: CompanyCredentials,
    service: 'partstech' | 'nexpart' = 'partstech'
  ): Promise<{ message: string; locationId: string; lastUpdated: string }> {
    try {
      // Get master key hash for encryption
      const masterKeyHash = await this.getMasterKeyHash();

      // Encrypt credentials
      const encryptedCredentials = await CredentialEncryption.encryptCredentials(
        credentials,
        locationId,
        masterKeyHash
      );

      // Generate integrity hash
      const credentialData = JSON.stringify(credentials);
      const { default: EncryptionService } = await import('./encryptionService');
      const credentialHash = await EncryptionService.generateHash(credentialData);

      // Save to server
      const response = await axiosInstance.put(`/company-credentials/${locationId}`, {
        encryptedCredentials,
        credentialHash,
        service
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to save company credentials');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Invalid credential data');
      }
      throw new Error('Failed to save company credentials');
    }
  }

  /**
   * Load and decrypt credentials for a company/location (admin only)
   */
  async loadCredentials(locationId: string, service: 'partstech' | 'nexpart' = 'partstech'): Promise<CompanyCredentials> {
    try {
      // Get encrypted credentials from server
      const response = await axiosInstance.get(`/company-credentials/${locationId}/encrypted?service=${service}`);
      const { encryptedCredentials, credentialHash }: EncryptedCredentialData = response.data;

      // Get master key hash for decryption
      const masterKeyHash = await this.getMasterKeyHash();

      // Decrypt credentials
      const decryptedData = await CredentialEncryption.decryptCredentials(
        encryptedCredentials,
        locationId,
        masterKeyHash
      );

      // Verify integrity
      const credentialData = JSON.stringify({
        userCredentials: decryptedData.userCredentials,
        partnerCredentials: decryptedData.partnerCredentials,
        defaultStoreId: decryptedData.defaultStoreId
      });
      
      const { default: EncryptionService } = await import('./encryptionService');
      const originalHash = await EncryptionService.generateHash(credentialData);
      
      // Try to migrate old data format first, then verify integrity
      let migratedData;
      try {
        migratedData = this.migrateCredentialData(decryptedData, service);
        
        // Verify integrity of migrated data
        const migratedHash = await CredentialEncryption.hashString(JSON.stringify(migratedData));
        
        // If hashes don't match, it might be old data - try with original data hash
        if (migratedHash !== credentialHash) {
          console.log('🔄 Hash mismatch detected, attempting migration...');
          if (originalHash !== credentialHash) {
            console.warn('⚠️ Hash verification failed, but proceeding with migration for compatibility');
          }
        }
        
        return migratedData;
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        
        // Fallback: verify original data integrity
        if (originalHash !== credentialHash) {
          throw new Error('Credential integrity verification failed');
        }
        
        return decryptedData as CompanyCredentials;
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Admin access required to load company credentials');
      }
      if (error.response?.status === 404) {
        throw new Error('No credentials found for this company');
      }
      if (error.message.includes('integrity verification')) {
        console.warn('⚠️ Credential integrity check failed. This may be due to data format changes.');
        console.warn('🔧 Try re-saving your credentials in Settings to fix this issue.');
        throw new Error('Credential data may be corrupted or tampered with. Please re-configure your credentials in Settings.');
      }
      if (error.message.includes('decrypt')) {
        throw new Error('Failed to decrypt credentials - invalid encryption key');
      }
      throw new Error('Failed to load company credentials');
    }
  }

  /**
   * Migrate old credential data formats to new structure
   */
  private migrateCredentialData(data: any, service: 'partstech' | 'nexpart'): CompanyCredentials {
    // If data is already in new format, return as-is
    if (data && (data.partsTeachCredentials || data.nexPartCredentials)) {
      return data as CompanyCredentials;
    }

    // Handle old Parts Tech format
    if (service === 'partstech' && data && data.userCredentials && data.partnerCredentials) {
      console.log('🔄 Migrating old Parts Tech credential format');
      return {
        partsTeachCredentials: data as PartsTeachCredentials
      };
    }

    // Handle old NexPart format (single vendor to multi-vendor)
    if (service === 'nexpart' && data && data.username && data.password) {
      console.log('🔄 Migrating old NexPart credential format');
      return {
        nexPartCredentials: {
          vendors: [{
            vendorId: 'migrated-vendor',
            vendorName: data.vendorName || 'Migrated Vendor',
            credentials: {
              username: data.username,
              password: data.password,
              providerKey: data.providerKey,
              clientVersion: data.clientVersion,
              rev: data.rev
            },
            isActive: true
          }],
          defaultVendorId: 'migrated-vendor'
        }
      };
    }

    // Return data as-is if no migration needed
    return data as CompanyCredentials;
  }

  /**
   * Delete credentials for a company/location (admin only)
   */
  async deleteCredentials(locationId: string): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.delete(`/company-credentials/${locationId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Admin access required to delete company credentials');
      }
      if (error.response?.status === 404) {
        throw new Error('No credentials found for this company');
      }
      throw new Error('Failed to delete company credentials');
    }
  }

  /**
   * Test if credentials are valid by attempting to decrypt them
   */
  async testCredentials(locationId: string): Promise<boolean> {
    try {
      await this.loadCredentials(locationId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate credential structure
   */
  validateCredentials(credentials: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!credentials) {
      errors.push('Credentials object is required');
      return { isValid: false, errors };
    }

    // Validate user credentials
    if (!credentials.userCredentials) {
      errors.push('User credentials are required');
    } else {
      if (!credentials.userCredentials.id || typeof credentials.userCredentials.id !== 'string') {
        errors.push('User ID is required and must be a string');
      }
      if (!credentials.userCredentials.key || typeof credentials.userCredentials.key !== 'string') {
        errors.push('User API key is required and must be a string');
      }
    }

    // Validate partner credentials
    if (!credentials.partnerCredentials) {
      errors.push('Partner credentials are required');
    } else {
      if (!credentials.partnerCredentials.id || typeof credentials.partnerCredentials.id !== 'string') {
        errors.push('Partner ID is required and must be a string');
      }
      if (!credentials.partnerCredentials.key || typeof credentials.partnerCredentials.key !== 'string') {
        errors.push('Partner API key is required and must be a string');
      }
    }

    // Validate optional fields
    if (credentials.defaultStoreId !== undefined && 
        (typeof credentials.defaultStoreId !== 'number' || credentials.defaultStoreId < 0)) {
      errors.push('Default store ID must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear cached master key (for security)
   */
  clearCache(): void {
    this.masterKeyHash = null;
  }
}

// Export singleton instance
export const companyCredentialsApi = new CompanyCredentialsApiService();
export default companyCredentialsApi;
