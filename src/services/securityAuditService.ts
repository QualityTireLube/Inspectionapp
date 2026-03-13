/**
 * Security Audit Service
 * 
 * Provides security monitoring and audit logging for credential operations
 */

interface SecurityEvent {
  eventType: 'credential_access' | 'credential_save' | 'credential_delete' | 'credential_test' | 'encryption_error' | 'unauthorized_access';
  userId: string;
  userRole: string;
  locationId?: string;
  locationName?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

class SecurityAuditService {
  private static readonly AUDIT_LOG_KEY = 'security_audit_log';
  private static readonly MAX_LOG_ENTRIES = 1000;

  /**
   * Log a security event
   */
  static logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    try {
      const auditEvent: SecurityEvent = {
        ...event,
        timestamp: new Date().toISOString()
      };

      // Get existing log
      const existingLog = this.getAuditLog();
      
      // Add new event
      existingLog.unshift(auditEvent);
      
      // Trim to max entries
      if (existingLog.length > this.MAX_LOG_ENTRIES) {
        existingLog.splice(this.MAX_LOG_ENTRIES);
      }
      
      // Save back to storage
      localStorage.setItem(this.AUDIT_LOG_KEY, JSON.stringify(existingLog));
      
      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 Security Event:', auditEvent);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get audit log entries
   */
  static getAuditLog(): SecurityEvent[] {
    try {
      const stored = localStorage.getItem(this.AUDIT_LOG_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load audit log:', error);
      return [];
    }
  }

  /**
   * Get recent security events for a specific location
   */
  static getLocationSecurityEvents(locationId: string, limit: number = 50): SecurityEvent[] {
    const allEvents = this.getAuditLog();
    return allEvents
      .filter(event => event.locationId === locationId)
      .slice(0, limit);
  }

  /**
   * Get failed access attempts
   */
  static getFailedAccessAttempts(timeWindowHours: number = 24): SecurityEvent[] {
    const cutoffTime = new Date(Date.now() - (timeWindowHours * 60 * 60 * 1000));
    const allEvents = this.getAuditLog();
    
    return allEvents.filter(event => 
      !event.success && 
      new Date(event.timestamp) > cutoffTime &&
      ['credential_access', 'unauthorized_access'].includes(event.eventType)
    );
  }

  /**
   * Check for suspicious activity patterns
   */
  static detectSuspiciousActivity(): {
    hasSuspiciousActivity: boolean;
    alerts: string[];
  } {
    const alerts: string[] = [];
    const recentFailures = this.getFailedAccessAttempts(1); // Last hour
    const recentEvents = this.getAuditLog().slice(0, 100);

    // Check for multiple failed attempts
    if (recentFailures.length > 5) {
      alerts.push(`${recentFailures.length} failed access attempts in the last hour`);
    }

    // Check for unusual access patterns
    const uniqueUsers = new Set(recentEvents.map(e => e.userId));
    const uniqueLocations = new Set(recentEvents.filter(e => e.locationId).map(e => e.locationId));
    
    if (uniqueUsers.size > 10) {
      alerts.push(`Unusual number of users (${uniqueUsers.size}) accessing credentials recently`);
    }

    if (uniqueLocations.size > 5) {
      alerts.push(`Credentials accessed for ${uniqueLocations.size} different locations recently`);
    }

    return {
      hasSuspiciousActivity: alerts.length > 0,
      alerts
    };
  }

  /**
   * Clear audit log (admin only)
   */
  static clearAuditLog(): void {
    localStorage.removeItem(this.AUDIT_LOG_KEY);
  }

  /**
   * Export audit log for external analysis
   */
  static exportAuditLog(): string {
    const log = this.getAuditLog();
    return JSON.stringify(log, null, 2);
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): {
    totalEvents: number;
    successfulAccess: number;
    failedAccess: number;
    credentialsSaved: number;
    credentialsDeleted: number;
    lastActivity: string | null;
    mostActiveLocation: string | null;
    mostActiveUser: string | null;
  } {
    const events = this.getAuditLog();
    
    const stats = {
      totalEvents: events.length,
      successfulAccess: events.filter(e => e.success && e.eventType === 'credential_access').length,
      failedAccess: events.filter(e => !e.success && e.eventType === 'credential_access').length,
      credentialsSaved: events.filter(e => e.eventType === 'credential_save').length,
      credentialsDeleted: events.filter(e => e.eventType === 'credential_delete').length,
      lastActivity: events.length > 0 ? events[0].timestamp : null,
      mostActiveLocation: null as string | null,
      mostActiveUser: null as string | null
    };

    // Find most active location
    const locationCounts = events.reduce((acc, event) => {
      if (event.locationId) {
        acc[event.locationId] = (acc[event.locationId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(locationCounts).length > 0) {
      stats.mostActiveLocation = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
    }

    // Find most active user
    const userCounts = events.reduce((acc, event) => {
      acc[event.userId] = (acc[event.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(userCounts).length > 0) {
      stats.mostActiveUser = Object.entries(userCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
    }

    return stats;
  }
}

/**
 * Security validation utilities
 */
export class SecurityValidator {
  /**
   * Validate user permissions for credential operations
   */
  static validateCredentialAccess(userRole: string, operation: 'view' | 'edit' | 'delete'): boolean {
    switch (operation) {
      case 'view':
        return ['Admin', 'Manager'].includes(userRole);
      case 'edit':
        return ['Admin', 'Manager'].includes(userRole);
      case 'delete':
        return userRole === 'Admin';
      default:
        return false;
    }
  }

  /**
   * Validate credential strength
   */
  static validateCredentialStrength(credentials: any): {
    isValid: boolean;
    warnings: string[];
    score: number; // 0-100
  } {
    const warnings: string[] = [];
    let score = 0;

    if (!credentials) {
      return { isValid: false, warnings: ['Credentials are required'], score: 0 };
    }

    // Check user credentials
    if (credentials.userCredentials?.id) {
      score += 20;
      if (credentials.userCredentials.id.length < 8) {
        warnings.push('User ID should be at least 8 characters long');
      } else {
        score += 10;
      }
    }

    if (credentials.userCredentials?.key) {
      score += 20;
      if (credentials.userCredentials.key.length < 16) {
        warnings.push('User API key should be at least 16 characters long');
      } else {
        score += 10;
      }
    }

    // Check partner credentials
    if (credentials.partnerCredentials?.id) {
      score += 20;
      if (credentials.partnerCredentials.id.length < 8) {
        warnings.push('Partner ID should be at least 8 characters long');
      } else {
        score += 10;
      }
    }

    if (credentials.partnerCredentials?.key) {
      score += 20;
      if (credentials.partnerCredentials.key.length < 16) {
        warnings.push('Partner API key should be at least 16 characters long');
      } else {
        score += 10;
      }
    }

    return {
      isValid: score >= 80,
      warnings,
      score
    };
  }

  /**
   * Check for common security issues
   */
  static performSecurityCheck(): {
    passed: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if running over HTTPS in production
    if (window.location.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      issues.push('Application is not running over HTTPS in production');
      recommendations.push('Enable HTTPS to protect credential transmission');
    }

    // Check for suspicious activity
    const suspiciousActivity = SecurityAuditService.detectSuspiciousActivity();
    if (suspiciousActivity.hasSuspiciousActivity) {
      issues.push('Suspicious security activity detected');
      recommendations.push('Review recent audit logs and investigate unusual access patterns');
    }

    // Check browser security features
    if (!window.crypto || !window.crypto.subtle) {
      issues.push('Web Crypto API not available');
      recommendations.push('Use a modern browser that supports Web Crypto API');
    }

    // Check for development mode in production
    if (process.env.NODE_ENV === 'development' && window.location.hostname !== 'localhost') {
      issues.push('Application running in development mode on non-localhost');
      recommendations.push('Ensure production builds are used in production environments');
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations
    };
  }
}

export default SecurityAuditService;
