/**
 * Central Debug Manager
 * Controls all logging and debugging throughout the application
 */

export interface DebugSettings {
  // Core categories
  general: boolean;          // General application logging
  api: boolean;             // HTTP API calls and responses
  auth: boolean;            // Authentication and login flows
  websocket: boolean;       // WebSocket connections and messages
  webhooks: boolean;        // Webhook events and processing
  storage: boolean;         // LocalStorage and data persistence
  
  // Communication & Integration
  shopMonkey: boolean;      // ShopMonkey integration
  notifications: boolean;  // Push notifications and alerts
  
  // Business Modules & Inspections
  quickCheck: boolean;      // QuickCheck inspections and workflow
  stateInspection: boolean; // State inspection records and compliance
  dvi: boolean;             // DOT Vehicle Inspections (DVI)
  tpms: boolean;            // Tire Pressure Monitoring System inspections
  tireRepair: boolean;      // Tire repair workflows and guided modals
  cashManagement: boolean;  // Bank deposits and drawer count operations
  
  // Features & Components
  print: boolean;           // Print management and queue operations
  labels: boolean;          // Label creation and management
  stickers: boolean;        // Sticker operations
  imageUpload: boolean;     // Image upload and processing
  fileSystem: boolean;      // File operations and uploads
  
  // User Interface
  navigation: boolean;      // Page navigation and routing
  forms: boolean;           // Form validation and submission
  ui: boolean;              // UI component interactions
  
  // Data & Database
  database: boolean;        // Database operations
  sync: boolean;            // Data synchronization
  cache: boolean;           // Caching operations
  
  // Platform & Browser
  safari: boolean;          // Safari-specific debugging
  mobile: boolean;          // Mobile-specific functionality
  pwa: boolean;             // Progressive Web App features
  audio: boolean;           // Audio notifications and sounds
  
  // Print Client specific
  printClient: boolean;     // Print client operations
  printQueue: boolean;      // Print queue management
  cups: boolean;            // CUPS printer system
  
  // System & Performance
  performance: boolean;     // Performance monitoring
  network: boolean;         // Network connectivity and issues
  security: boolean;        // Security-related events
  
  // Development & Debugging
  development: boolean;     // Development-only debugging
  testing: boolean;         // Test execution and results
  
  // Logging levels (always available)
  errors: boolean;          // Error logging (always recommended to keep on)
  warnings: boolean;        // Warning messages
  info: boolean;            // Informational messages
  debug: boolean;           // Detailed debug information
}

export type DebugCategory = keyof DebugSettings;

class DebugManager {
  private static instance: DebugManager;
  private settings: DebugSettings;
  private storageKey = 'quickcheck_debug_settings';

  private constructor() {
    // Load settings from localStorage or use defaults
    this.settings = this.loadSettings();
  }

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  private getDefaultSettings(): DebugSettings {
    return {
      // Core categories
      general: false,
      api: false,
      auth: false,
      websocket: false,
      webhooks: false,
      storage: false,
      
      // Communication & Integration
      shopMonkey: false,
      notifications: false,
      
      // Business Modules & Inspections
      quickCheck: false,
      stateInspection: false,
      dvi: false,
      tpms: false,
      tireRepair: false,
      cashManagement: false,
      
      // Features & Components
      print: false,
      labels: false,
      stickers: false,
      imageUpload: false,
      fileSystem: false,
      
      // User Interface
      navigation: false,
      forms: false,
      ui: false,
      
      // Data & Database
      database: false,
      sync: false,
      cache: false,
      
      // Platform & Browser
      safari: false,
      mobile: false,
      pwa: false,
      audio: false,
      
      // Print Client specific
      printClient: false,
      printQueue: false,
      cups: false,
      
      // System & Performance
      performance: false,
      network: false,
      security: false,
      
      // Development & Debugging
      development: false,
      testing: false,
      
      // Logging levels (keep important ones on by default)
      errors: true,
      warnings: true,
      info: false,
      debug: false,
    };
  }

  private loadSettings(): DebugSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all categories exist
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load debug settings from localStorage:', error);
    }
    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save debug settings to localStorage:', error);
    }
  }

  /**
   * Get current debug settings
   */
  getSettings(): DebugSettings {
    return { ...this.settings };
  }

  /**
   * Update debug settings
   */
  updateSettings(newSettings: Partial<DebugSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Log the settings change if general debugging is enabled
    if (this.settings.general) {
      console.log('🔧 Debug settings updated:', newSettings);
    }
  }

  /**
   * Check if a specific debug category is enabled
   */
  isEnabled(category: DebugCategory): boolean {
    return this.settings[category];
  }

  /**
   * Enable all debug categories
   */
  enableAll(): void {
    const allEnabled = Object.keys(this.settings).reduce((acc, key) => {
      acc[key as DebugCategory] = true;
      return acc;
    }, {} as DebugSettings);
    
    this.updateSettings(allEnabled);
  }

  /**
   * Disable all debug categories except errors and warnings
   */
  disableAll(): void {
    const allDisabled = Object.keys(this.settings).reduce((acc, key) => {
      // Keep errors and warnings enabled
      acc[key as DebugCategory] = key === 'errors' || key === 'warnings';
      return acc;
    }, {} as DebugSettings);
    
    this.updateSettings(allDisabled);
  }

  /**
   * Main logging method - use this instead of console.log
   */
  log(category: DebugCategory, message: string, ...args: any[]): void {
    if (!this.isEnabled(category)) {
      return;
    }

    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const categoryEmoji = this.getCategoryEmoji(category);
    const prefix = `${categoryEmoji} [${timestamp}:${category.toUpperCase()}]`;

    console.log(`${prefix} ${message}`, ...args);
  }

  /**
   * Warning logging - always visible if warnings are enabled
   */
  warn(category: DebugCategory, message: string, ...args: any[]): void {
    if (!this.isEnabled('warnings')) {
      return;
    }

    const timestamp = new Date().toISOString().slice(11, 23);
    const categoryEmoji = this.getCategoryEmoji(category);
    const prefix = `⚠️ [${timestamp}:${category.toUpperCase()}]`;

    console.warn(`${prefix} ${message}`, ...args);
  }

  /**
   * Error logging - always visible if errors are enabled
   */
  error(category: DebugCategory, message: string, ...args: any[]): void {
    if (!this.isEnabled('errors')) {
      return;
    }

    const timestamp = new Date().toISOString().slice(11, 23);
    const categoryEmoji = this.getCategoryEmoji(category);
    const prefix = `❌ [${timestamp}:${category.toUpperCase()}]`;

    console.error(`${prefix} ${message}`, ...args);
  }

  /**
   * Grouped logging for related operations
   */
  group(category: DebugCategory, groupName: string, collapsed: boolean = false): void {
    if (!this.isEnabled(category)) {
      return;
    }

    const categoryEmoji = this.getCategoryEmoji(category);
    const groupTitle = `${categoryEmoji} ${groupName}`;
    
    if (collapsed) {
      console.groupCollapsed(groupTitle);
    } else {
      console.group(groupTitle);
    }
  }

  /**
   * End grouped logging
   */
  groupEnd(category: DebugCategory): void {
    if (!this.isEnabled(category)) {
      return;
    }
    console.groupEnd();
  }

  /**
   * Get emoji for debug category
   */
  private getCategoryEmoji(category: DebugCategory): string {
    const emojiMap: Record<DebugCategory, string> = {
      // Core categories
      general: '🔧',
      api: '🌐',
      auth: '🔐',
      websocket: '🔌',
      webhooks: '🪝',
      storage: '💾',
      
      // Communication & Integration
      shopMonkey: '🐒',
      notifications: '🔔',
      
      // Business Modules & Inspections
      quickCheck: '🔍',
      stateInspection: '📋',
      dvi: '🚛',
      tpms: '🛞',
      tireRepair: '🔧',
      cashManagement: '💰',
      
      // Features & Components
      print: '🖨️',
      labels: '🏷️',
      stickers: '📋',
      imageUpload: '📸',
      fileSystem: '📁',
      
      // User Interface
      navigation: '🧭',
      forms: '📝',
      ui: '🎨',
      
      // Data & Database
      database: '🗄️',
      sync: '🔄',
      cache: '⚡',
      
      // Platform & Browser
      safari: '🦁',
      mobile: '📱',
      pwa: '📱',
      audio: '🔊',
      
      // Print Client specific
      printClient: '🖥️',
      printQueue: '📋',
      cups: '☕',
      
      // System & Performance
      performance: '⚡',
      network: '🌍',
      security: '🔒',
      
      // Development & Debugging
      development: '🚧',
      testing: '🧪',
      
      // Logging levels
      errors: '❌',
      warnings: '⚠️',
      info: 'ℹ️',
      debug: '🐛',
    };
    
    return emojiMap[category] || '🔧';
  }

  /**
   * Export all debug logs (if any loggers have exportable logs)
   */
  exportLogs(): void {
    try {
      // Get current timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `quickcheck-debug-logs-${timestamp}.txt`;
      
      // Compile debug information
      const debugInfo = [
        `QuickCheck Debug Export - ${new Date().toISOString()}`,
        `===============================================`,
        '',
        'Current Debug Settings:',
        JSON.stringify(this.settings, null, 2),
        '',
        'User Agent:',
        navigator.userAgent,
        '',
        'Current URL:',
        window.location.href,
        '',
        '===============================================',
        'Note: Individual component logs (PrintManager, etc.) should be exported separately.',
        ''
      ].join('\n');

      // Create and download file
      const blob = new Blob([debugInfo], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.log('general', 'Debug settings exported to file:', filename);
    } catch (error) {
      this.error('general', 'Failed to export debug logs:', error);
    }
  }

  /**
   * Get category descriptions for UI
   */
  getCategoryDescriptions(): Record<DebugCategory, string> {
    return {
      // Core categories
      general: 'General application logging and operations',
      api: 'HTTP API calls, responses, and REST endpoints',
      auth: 'Authentication, login flows, and token management',
      websocket: 'WebSocket connections and real-time communication',
      webhooks: 'Webhook events, processing, and external callbacks',
      storage: 'LocalStorage, sessionStorage, and data persistence',
      
      // Communication & Integration
      shopMonkey: 'ShopMonkey integration and order synchronization',
      notifications: 'Push notifications, alerts, and user notifications',
      
      // Business Modules & Inspections
      quickCheck: 'QuickCheck inspections, forms, and workflow logic',
      stateInspection: 'State inspection records, compliance, and analytics',
      dvi: 'DOT Vehicle Inspections (DVI) and commercial vehicle checks',
      tpms: 'Tire Pressure Monitoring System inspections and tools',
      tireRepair: 'Tire repair workflows, guided modals, and procedures',
      cashManagement: 'Bank deposits, drawer counts, and cash analytics',
      
      // Features & Components
      print: 'Print management, templates, and print operations',
      labels: 'Label creation, editing, and template management',
      stickers: 'Sticker operations and static sticker management',
      imageUpload: 'Image upload, processing, and HEIC conversion',
      fileSystem: 'File operations, uploads, and document handling',
      
      // User Interface
      navigation: 'Page navigation, routing, and URL changes',
      forms: 'Form validation, submission, and field interactions',
      ui: 'UI component interactions and state changes',
      
      // Data & Database
      database: 'Database operations, queries, and transactions',
      sync: 'Data synchronization and conflict resolution',
      cache: 'Caching operations and cache invalidation',
      
      // Platform & Browser
      safari: 'Safari browser compatibility and platform fixes',
      mobile: 'Mobile-specific functionality and touch interactions',
      pwa: 'Progressive Web App features and service worker',
      audio: 'Audio notifications, sound playback, and media',
      
      // Print Client specific
      printClient: 'Native print client operations and communication',
      printQueue: 'Print queue management and job processing',
      cups: 'CUPS printer system and driver interactions',
      
      // System & Performance
      performance: 'Performance monitoring, timing, and optimization',
      network: 'Network connectivity, status, and connection issues',
      security: 'Security events, token validation, and access control',
      
      // Development & Debugging
      development: 'Development-only debugging and testing features',
      testing: 'Test execution, assertions, and test results',
      
      // Logging levels
      errors: 'Error messages and exception handling',
      warnings: 'Warning messages and potential issues',
      info: 'Informational messages and status updates',
      debug: 'Detailed debug information and verbose logging',
    };
  }
}

// Export singleton instance
export const debugManager = DebugManager.getInstance();

// Convenience functions for common usage
export const debug = {
  log: (category: DebugCategory, message: string, ...args: any[]) => 
    debugManager.log(category, message, ...args),
  warn: (category: DebugCategory, message: string, ...args: any[]) => 
    debugManager.warn(category, message, ...args),
  error: (category: DebugCategory, message: string, ...args: any[]) => 
    debugManager.error(category, message, ...args),
  group: (category: DebugCategory, groupName: string, collapsed?: boolean) => 
    debugManager.group(category, groupName, collapsed),
  groupEnd: (category: DebugCategory) => 
    debugManager.groupEnd(category),
  isEnabled: (category: DebugCategory) => 
    debugManager.isEnabled(category),
};
