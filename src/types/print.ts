// Print Client - represents a physical print client application at a location
export interface PrintClient {
  id: string;
  name: string; // User-friendly name: "Main Office Invoice Printer"
  locationId: string; // Which location this client belongs to
  clientId: string; // Technical ID from print client app
  description?: string;
  status: 'online' | 'offline' | 'error';
  lastSeen?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  printers?: PrinterConfig[]; // Printers connected to this client
}

// Form data for creating/updating print clients
export interface PrintClientFormData {
  name: string;
  locationId: string;
  clientId: string;
  description?: string;
}

// Print client with its associated printers
export interface PrintClientWithPrinters extends PrintClient {
  printers: PrinterConfig[];
}

export interface PrinterConfig {
  id: string;
  name: string;
  model: string;
  ipAddress?: string;
  port?: number;
  connectionType: 'usb' | 'network' | 'bluetooth';
  status: 'online' | 'offline' | 'error' | 'unknown';
  capabilities: {
    paperSizes: string[];
    orientations: ('portrait' | 'landscape')[];
    maxWidth: number; // in mm
    maxHeight: number; // in mm
    dpi: number[];
  };
  lastSeen?: Date;
  printClientId?: string; // Which print client this printer belongs to
  systemPrinterName?: string; // Exact system printer name for CUPS
}

export interface PrintConfiguration {
  formName: string; // e.g., 'labels', 'oil-stickers', 'receipts'
  printerId: string;
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  copies: number;
  quality: 'draft' | 'normal' | 'high';
  colorMode: 'color' | 'grayscale' | 'monochrome';
  customSettings?: Record<string, any>; // Printer-specific settings
  locationId?: string; // Location this configuration applies to
  targetClientId?: string; // Specific print client to handle this form
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintJob {
  id: string;
  formName: string;
  printerId: string;
  locationId?: string; // Location this job is for
  targetClientId?: string; // Specific print client to handle this job
  configuration: PrintConfiguration;
  jobData: any; // The actual data to print (form data, images, etc.)
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface PrintJobRequest {
  formName: string;
  jobData: any;
  locationId?: string; // Location to route the job to
  options?: {
    copies?: number;
    priority?: PrintJob['priority'];
    confirmSecondCopy?: boolean;
  };
}

export interface PrintStatus {
  jobId: string;
  status: PrintJob['status'];
  progress?: number; // 0-100
  pagesCompleted?: number;
  totalPages?: number;
  estimatedTimeRemaining?: number; // in seconds
  error?: string;
}

export interface PrinterStatus {
  printerId: string;
  status: PrinterConfig['status'];
  currentJob?: string; // job ID
  queueLength: number;
  paperLevel?: number; // 0-100
  inkLevel?: {
    black?: number;
    cyan?: number;
    magenta?: number;
    yellow?: number;
  };
  temperature?: number;
  lastError?: string;
  lastPing: Date;
}

export interface PrintTemplate {
  id: string;
  name: string;
  formName: string;
  templateType: 'label' | 'receipt' | 'sticker' | 'report';
  format: 'html' | 'pdf' | 'image' | 'zpl' | 'epl'; // ZPL for Zebra, EPL for some thermal printers
  content: string; // Template content (HTML, ZPL commands, etc.)
  variables: string[]; // Available variables for substitution
  previewUrl?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintQueue {
  jobs: PrintJob[];
  totalJobs: number;
  processingJob?: PrintJob;
  lastProcessed?: Date;
}

// Configuration persistence options
export interface PrintStorageConfig {
  storageType: 'localStorage' | 'backend' | 'both';
  backupToBackend: boolean;
  syncInterval: number; // in minutes
}

// Print notification settings
export interface PrintNotificationSettings {
  showSuccess: boolean;
  showErrors: boolean;
  showWarnings: boolean;
  soundEnabled: boolean;
  notificationDuration: number; // in milliseconds
}

// Print metrics for analytics
export interface PrintMetrics {
  formName: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averagePrintTime: number; // in seconds
  lastPrinted?: Date;
  paperUsed: number; // estimated sheets
  costEstimate?: number; // if cost tracking is enabled
}

// Error types
export interface PrintError {
  code: 'PRINTER_OFFLINE' | 'INVALID_CONFIG' | 'NETWORK_ERROR' | 'PAPER_JAM' | 
        'OUT_OF_PAPER' | 'LOW_INK' | 'UNKNOWN_ERROR' | 'TIMEOUT' | 'CANCELLED';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

// Events
export interface PrintEvent {
  type: 'job_created' | 'job_started' | 'job_completed' | 'job_failed' | 
        'printer_connected' | 'printer_disconnected' | 'config_updated';
  data: any;
  timestamp: Date;
} 