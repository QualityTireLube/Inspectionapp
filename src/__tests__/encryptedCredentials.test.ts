/**
 * Comprehensive test suite for encrypted company credentials system
 */

import EncryptionService, { CredentialEncryption } from '../services/encryptionService';
import companyCredentialsApi, { PartsTeachCredentials } from '../services/companyCredentialsApi';
import SecurityAuditService, { SecurityValidator } from '../services/securityAuditService';

// Mock the API
jest.mock('../services/api');

describe('Encrypted Credentials System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('EncryptionService', () => {
    const testData = 'This is sensitive test data';
    const testPassword = 'test-password-123';

    it('should encrypt and decrypt data correctly', async () => {
      const encrypted = await EncryptionService.encrypt(testData, testPassword);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(testData);

      const decrypted = await EncryptionService.decrypt(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with wrong password', async () => {
      const encrypted = await EncryptionService.encrypt(testData, testPassword);
      
      await expect(
        EncryptionService.decrypt(encrypted, 'wrong-password')
      ).rejects.toThrow('Failed to decrypt data');
    });

    it('should generate different encrypted outputs for same input', async () => {
      const encrypted1 = await EncryptionService.encrypt(testData, testPassword);
      const encrypted2 = await EncryptionService.encrypt(testData, testPassword);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      const decrypted1 = await EncryptionService.decrypt(encrypted1, testPassword);
      const decrypted2 = await EncryptionService.decrypt(encrypted2, testPassword);
      
      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
    });

    it('should generate secure hashes', async () => {
      const hash1 = await EncryptionService.generateHash(testData);
      const hash2 = await EncryptionService.generateHash(testData);
      
      expect(hash1).toBe(hash2); // Same input should produce same hash
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
      
      const differentHash = await EncryptionService.generateHash('different data');
      expect(differentHash).not.toBe(hash1);
    });

    it('should verify hashes correctly', async () => {
      const hash = await EncryptionService.generateHash(testData);
      
      const isValid = await EncryptionService.verifyHash(testData, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await EncryptionService.verifyHash('different data', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('CredentialEncryption', () => {
    const testCredentials: PartsTeachCredentials = {
      userCredentials: {
        id: 'test-user-id',
        key: 'test-user-key-12345'
      },
      partnerCredentials: {
        id: 'test-partner-id',
        key: 'test-partner-key-12345'
      },
      defaultStoreId: 123
    };
    
    const locationId = 'test-location-123';
    const masterKey = 'test-master-key-abcdef1234567890';

    it('should encrypt credentials with location-specific key', async () => {
      const encrypted = await CredentialEncryption.encryptCredentials(
        testCredentials,
        locationId,
        masterKey
      );
      
      expect(encrypted).toStartWith('QTCRED_');
      expect(encrypted.length).toBeGreaterThan(100); // Should be substantial length
    });

    it('should decrypt credentials correctly', async () => {
      const encrypted = await CredentialEncryption.encryptCredentials(
        testCredentials,
        locationId,
        masterKey
      );
      
      const decrypted = await CredentialEncryption.decryptCredentials(
        encrypted,
        locationId,
        masterKey
      );
      
      expect(decrypted.userCredentials).toEqual(testCredentials.userCredentials);
      expect(decrypted.partnerCredentials).toEqual(testCredentials.partnerCredentials);
      expect(decrypted.defaultStoreId).toBe(testCredentials.defaultStoreId);
      expect(decrypted.locationId).toBe(locationId);
    });

    it('should fail to decrypt with wrong location ID', async () => {
      const encrypted = await CredentialEncryption.encryptCredentials(
        testCredentials,
        locationId,
        masterKey
      );
      
      await expect(
        CredentialEncryption.decryptCredentials(encrypted, 'wrong-location', masterKey)
      ).rejects.toThrow();
    });

    it('should fail to decrypt with wrong master key', async () => {
      const encrypted = await CredentialEncryption.encryptCredentials(
        testCredentials,
        locationId,
        masterKey
      );
      
      await expect(
        CredentialEncryption.decryptCredentials(encrypted, locationId, 'wrong-master-key')
      ).rejects.toThrow();
    });

    it('should validate credential structure', () => {
      const valid = CredentialEncryption.validateCredentials(testCredentials);
      expect(valid).toBe(true);
      
      const invalid1 = CredentialEncryption.validateCredentials(null);
      expect(invalid1).toBe(false);
      
      const invalid2 = CredentialEncryption.validateCredentials({
        userCredentials: { id: 'test' } // missing key
      });
      expect(invalid2).toBe(false);
      
      const invalid3 = CredentialEncryption.validateCredentials({
        userCredentials: { id: 'test', key: 'test' },
        partnerCredentials: { id: 'test' } // missing key
      });
      expect(invalid3).toBe(false);
    });

    it('should reject invalid credential format', async () => {
      await expect(
        CredentialEncryption.decryptCredentials('invalid-format', locationId, masterKey)
      ).rejects.toThrow('Invalid credential format');
    });

    it('should detect location mismatch', async () => {
      const encrypted = await CredentialEncryption.encryptCredentials(
        testCredentials,
        locationId,
        masterKey
      );
      
      // Manually modify the encrypted data to have wrong location
      const decrypted = await CredentialEncryption.decryptCredentials(
        encrypted,
        locationId,
        masterKey
      );
      
      // This should work normally
      expect(decrypted.locationId).toBe(locationId);
      
      // But trying to decrypt with different location should fail
      await expect(
        CredentialEncryption.decryptCredentials(encrypted, 'different-location', masterKey)
      ).rejects.toThrow();
    });
  });

  describe('CompanyCredentialsApi', () => {
    const mockCredentials: PartsTeachCredentials = {
      userCredentials: {
        id: 'api-test-user',
        key: 'api-test-user-key-12345'
      },
      partnerCredentials: {
        id: 'api-test-partner',
        key: 'api-test-partner-key-12345'
      },
      defaultStoreId: 456
    };

    it('should validate credentials correctly', () => {
      const validation = companyCredentialsApi.validateCredentials(mockCredentials);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid credentials', () => {
      const invalidCredentials = {
        userCredentials: { id: '' }, // missing key and empty id
        partnerCredentials: { key: 'test' } // missing id
      };
      
      const validation = companyCredentialsApi.validateCredentials(invalidCredentials);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('User ID is required and must be a string');
      expect(validation.errors).toContain('User API key is required and must be a string');
      expect(validation.errors).toContain('Partner ID is required and must be a string');
    });

    it('should validate optional fields correctly', () => {
      const credentialsWithInvalidStore = {
        ...mockCredentials,
        defaultStoreId: -1 // Invalid negative store ID
      };
      
      const validation = companyCredentialsApi.validateCredentials(credentialsWithInvalidStore);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Default store ID must be a positive number');
    });
  });

  describe('SecurityAuditService', () => {
    beforeEach(() => {
      SecurityAuditService.clearAuditLog();
    });

    it('should log security events', () => {
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_access',
        userId: 'test-user',
        userRole: 'Admin',
        locationId: 'test-location',
        locationName: 'Test Location',
        success: true
      });
      
      const log = SecurityAuditService.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].eventType).toBe('credential_access');
      expect(log[0].userId).toBe('test-user');
      expect(log[0].success).toBe(true);
    });

    it('should detect failed access attempts', () => {
      // Log multiple failed attempts
      for (let i = 0; i < 6; i++) {
        SecurityAuditService.logSecurityEvent({
          eventType: 'credential_access',
          userId: 'test-user',
          userRole: 'User',
          success: false,
          errorMessage: 'Insufficient permissions'
        });
      }
      
      const failedAttempts = SecurityAuditService.getFailedAccessAttempts(24);
      expect(failedAttempts).toHaveLength(6);
      
      const suspiciousActivity = SecurityAuditService.detectSuspiciousActivity();
      expect(suspiciousActivity.hasSuspiciousActivity).toBe(true);
      expect(suspiciousActivity.alerts.length).toBeGreaterThan(0);
    });

    it('should filter events by location', () => {
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_save',
        userId: 'user1',
        userRole: 'Admin',
        locationId: 'location1',
        success: true
      });
      
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_save',
        userId: 'user2',
        userRole: 'Admin',
        locationId: 'location2',
        success: true
      });
      
      const location1Events = SecurityAuditService.getLocationSecurityEvents('location1');
      expect(location1Events).toHaveLength(1);
      expect(location1Events[0].locationId).toBe('location1');
    });

    it('should generate security statistics', () => {
      // Add various events
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_access',
        userId: 'user1',
        userRole: 'Admin',
        success: true
      });
      
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_save',
        userId: 'user1',
        userRole: 'Admin',
        success: true
      });
      
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_access',
        userId: 'user2',
        userRole: 'Manager',
        success: false
      });
      
      const stats = SecurityAuditService.getSecurityStats();
      expect(stats.totalEvents).toBe(3);
      expect(stats.successfulAccess).toBe(1);
      expect(stats.failedAccess).toBe(1);
      expect(stats.credentialsSaved).toBe(1);
      expect(stats.lastActivity).toBeTruthy();
    });

    it('should limit log entries to maximum', () => {
      // Add more than the maximum entries
      for (let i = 0; i < 1100; i++) {
        SecurityAuditService.logSecurityEvent({
          eventType: 'credential_access',
          userId: `user${i}`,
          userRole: 'Admin',
          success: true
        });
      }
      
      const log = SecurityAuditService.getAuditLog();
      expect(log.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('SecurityValidator', () => {
    it('should validate user permissions correctly', () => {
      expect(SecurityValidator.validateCredentialAccess('Admin', 'view')).toBe(true);
      expect(SecurityValidator.validateCredentialAccess('Admin', 'edit')).toBe(true);
      expect(SecurityValidator.validateCredentialAccess('Admin', 'delete')).toBe(true);
      
      expect(SecurityValidator.validateCredentialAccess('Manager', 'view')).toBe(true);
      expect(SecurityValidator.validateCredentialAccess('Manager', 'edit')).toBe(true);
      expect(SecurityValidator.validateCredentialAccess('Manager', 'delete')).toBe(false);
      
      expect(SecurityValidator.validateCredentialAccess('User', 'view')).toBe(false);
      expect(SecurityValidator.validateCredentialAccess('User', 'edit')).toBe(false);
      expect(SecurityValidator.validateCredentialAccess('User', 'delete')).toBe(false);
    });

    it('should validate credential strength', () => {
      const strongCredentials = {
        userCredentials: {
          id: 'strong-user-id-12345',
          key: 'very-strong-api-key-with-sufficient-length'
        },
        partnerCredentials: {
          id: 'strong-partner-id-12345',
          key: 'very-strong-partner-key-with-sufficient-length'
        }
      };
      
      const validation = SecurityValidator.validateCredentialStrength(strongCredentials);
      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThanOrEqual(80);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect weak credentials', () => {
      const weakCredentials = {
        userCredentials: {
          id: 'short',
          key: 'weak'
        },
        partnerCredentials: {
          id: 'short',
          key: 'weak'
        }
      };
      
      const validation = SecurityValidator.validateCredentialStrength(weakCredentials);
      expect(validation.isValid).toBe(false);
      expect(validation.score).toBeLessThan(80);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should perform security checks', () => {
      // Mock window.crypto for testing
      Object.defineProperty(window, 'crypto', {
        value: {
          subtle: {}
        },
        writable: true
      });
      
      const securityCheck = SecurityValidator.performSecurityCheck();
      expect(securityCheck.passed).toBeDefined();
      expect(securityCheck.issues).toBeDefined();
      expect(securityCheck.recommendations).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete credential lifecycle', async () => {
      const credentials: PartsTeachCredentials = {
        userCredentials: {
          id: 'integration-user',
          key: 'integration-user-key-12345'
        },
        partnerCredentials: {
          id: 'integration-partner',
          key: 'integration-partner-key-12345'
        },
        defaultStoreId: 789
      };
      
      const locationId = 'integration-location';
      const masterKey = 'integration-master-key-abcdef1234567890';
      
      // 1. Encrypt credentials
      const encrypted = await CredentialEncryption.encryptCredentials(
        credentials,
        locationId,
        masterKey
      );
      
      expect(encrypted).toStartWith('QTCRED_');
      
      // 2. Decrypt credentials
      const decrypted = await CredentialEncryption.decryptCredentials(
        encrypted,
        locationId,
        masterKey
      );
      
      expect(decrypted.userCredentials).toEqual(credentials.userCredentials);
      expect(decrypted.partnerCredentials).toEqual(credentials.partnerCredentials);
      expect(decrypted.defaultStoreId).toBe(credentials.defaultStoreId);
      
      // 3. Validate credentials
      const validation = companyCredentialsApi.validateCredentials(credentials);
      expect(validation.isValid).toBe(true);
      
      // 4. Log security event
      SecurityAuditService.logSecurityEvent({
        eventType: 'credential_save',
        userId: 'integration-test',
        userRole: 'Admin',
        locationId,
        success: true
      });
      
      const log = SecurityAuditService.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].locationId).toBe(locationId);
    });

    it('should maintain security across multiple operations', async () => {
      const masterKey = 'multi-op-master-key';
      const locations = ['loc1', 'loc2', 'loc3'];
      const allCredentials: Record<string, PartsTeachCredentials> = {};
      
      // Encrypt credentials for multiple locations
      for (const locationId of locations) {
        const credentials: PartsTeachCredentials = {
          userCredentials: {
            id: `user-${locationId}`,
            key: `user-key-${locationId}-12345`
          },
          partnerCredentials: {
            id: `partner-${locationId}`,
            key: `partner-key-${locationId}-12345`
          },
          defaultStoreId: Math.floor(Math.random() * 1000)
        };
        
        allCredentials[locationId] = credentials;
        
        const encrypted = await CredentialEncryption.encryptCredentials(
          credentials,
          locationId,
          masterKey
        );
        
        // Verify each can be decrypted correctly
        const decrypted = await CredentialEncryption.decryptCredentials(
          encrypted,
          locationId,
          masterKey
        );
        
        expect(decrypted.userCredentials).toEqual(credentials.userCredentials);
        expect(decrypted.locationId).toBe(locationId);
      }
      
      // Verify cross-location security (shouldn't be able to decrypt with wrong location)
      const loc1Encrypted = await CredentialEncryption.encryptCredentials(
        allCredentials['loc1'],
        'loc1',
        masterKey
      );
      
      await expect(
        CredentialEncryption.decryptCredentials(loc1Encrypted, 'loc2', masterKey)
      ).rejects.toThrow();
    });
  });
});
