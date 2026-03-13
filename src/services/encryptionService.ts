/**
 * Secure Encryption Service for Sensitive Data
 * 
 * This service provides AES-256-GCM encryption for sensitive credentials
 * with proper key derivation and secure random IV generation.
 */

// Use Web Crypto API for secure encryption
class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly TAG_LENGTH = 128; // 128 bits for GCM tag
  private static readonly SALT_LENGTH = 32; // 256 bits for salt
  private static readonly ITERATIONS = 100000; // PBKDF2 iterations

  /**
   * Generate a cryptographically secure random key
   */
  private static generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a master key for the application
   * This should be called once and stored securely on the server
   */
  static generateMasterKey(): string {
    const key = this.generateRandomBytes(32); // 256 bits
    return Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt sensitive data
   */
  static async encrypt(plaintext: string, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      // Generate random salt and IV
      const salt = this.generateRandomBytes(this.SALT_LENGTH);
      const iv = this.generateRandomBytes(this.IV_LENGTH);

      // Derive encryption key
      const key = await this.deriveKey(password, salt);

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH
        },
        key,
        data
      );

      // Combine salt + iv + encrypted data
      const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Return as base64
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // Decode from base64
      const data = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract salt, IV, and encrypted data
      const salt = data.slice(0, this.SALT_LENGTH);
      const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH);

      // Derive decryption key
      const key = await this.deriveKey(password, salt);

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH
        },
        key,
        encrypted
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Generate a secure hash for data integrity verification
   */
  static async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify data integrity using hash
   */
  static async verifyHash(data: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.generateHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Securely wipe sensitive data from memory (best effort)
   */
  static secureWipe(sensitiveString: string): void {
    // Note: JavaScript doesn't provide true memory wiping,
    // but we can overwrite the string reference
    try {
      // Create a new string with random data of the same length
      const randomData = Array(sensitiveString.length)
        .fill(0)
        .map(() => String.fromCharCode(Math.floor(Math.random() * 256)))
        .join('');
      
      // This doesn't actually wipe memory in JS, but it's a best practice
      sensitiveString = randomData;
    } catch (error) {
      // Ignore errors in secure wipe
    }
  }
}

/**
 * Credential-specific encryption utilities
 */
export class CredentialEncryption {
  private static readonly CREDENTIAL_PREFIX = 'QTCRED_';
  
  /**
   * Encrypt credentials for a specific location (supports both Parts Tech and NexPart)
   */
  static async encryptCredentials(
    credentials: any, // Generic to support both Parts Tech and NexPart structures
    locationId: string,
    masterKey: string
  ): Promise<string> {
    // Create a location-specific encryption key
    const locationKey = await EncryptionService.generateHash(masterKey + locationId);
    
    // Serialize credentials with metadata
    const credentialData = JSON.stringify({
      ...credentials,
      timestamp: new Date().toISOString(),
      locationId: locationId
    });

    // Encrypt with location-specific key
    const encrypted = await EncryptionService.encrypt(credentialData, locationKey);
    
    return this.CREDENTIAL_PREFIX + encrypted;
  }

  /**
   * Decrypt credentials for a specific location (supports both Parts Tech and NexPart)
   */
  static async decryptCredentials(
    encryptedCredentials: string,
    locationId: string,
    masterKey: string
  ): Promise<any> {
    // Remove prefix
    if (!encryptedCredentials.startsWith(this.CREDENTIAL_PREFIX)) {
      throw new Error('Invalid credential format');
    }
    
    const encrypted = encryptedCredentials.substring(this.CREDENTIAL_PREFIX.length);
    
    // Create location-specific decryption key
    const locationKey = await EncryptionService.generateHash(masterKey + locationId);
    
    // Decrypt
    const decrypted = await EncryptionService.decrypt(encrypted, locationKey);
    
    // Parse and validate
    const credentials = JSON.parse(decrypted);
    
    // Verify location matches
    if (credentials.locationId !== locationId) {
      throw new Error('Credential location mismatch');
    }
    
    return credentials;
  }

  /**
   * Validate credential structure
   */
  static validateCredentials(credentials: any): boolean {
    return (
      credentials &&
      credentials.userCredentials &&
      typeof credentials.userCredentials.id === 'string' &&
      typeof credentials.userCredentials.key === 'string' &&
      credentials.partnerCredentials &&
      typeof credentials.partnerCredentials.id === 'string' &&
      typeof credentials.partnerCredentials.key === 'string'
    );
  }

  /**
   * Generate a hash string for data integrity
   */
  static async hashString(data: string): Promise<string> {
    return EncryptionService.generateHash(data);
  }

  /**
   * Verify hash string integrity
   */
  static async verifyHashString(data: string, expectedHash: string): Promise<boolean> {
    return EncryptionService.verifyHash(data, expectedHash);
  }
}

export default EncryptionService;
