import axios, { AxiosResponse } from 'axios';
import { getToken as authGetToken, isExpired as authIsExpired, logout as authLogout, scheduleAutoLogout as authSchedule } from '../auth';
import { 
  PrinterConfig, 
  PrintConfiguration, 
  PrintJob, 
  PrintJobRequest,
  PrinterStatus, 
  PrintTemplate,
  PrintQueue,
  PrintMetrics,
  PrintStatus,
  PrintError,
  PrintClient,
  PrintClientFormData,
  PrintClientWithPrinters
} from '../types/print';
import { PrintServerAuthClient, PrintServerAuthError, PrintServerNetworkError } from './printServerAuth';

// Use the same base URL pattern as other main app services
const getBaseUrl = () => {
  // Get environment URL or construct from current location
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  const hostname = window.location.hostname;
  
  // Production: use api.autoflopro.com subdomain
  if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
    return 'https://api.autoflopro.com';
  }
  
  // For print API, always use the backend server port (5001)
  const protocol = window.location.protocol;
  
  return `${protocol}//${hostname}:5001`;
};

const API_BASE = getBaseUrl();

// Determine the print API base URL - avoid double /api if already in base URL
const getPrintApiBase = () => {
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}/print`;
  }
  return `${API_BASE}/api/print`;
};

// Global print server auth client instance (for external print server communication)
let printServerAuthClient: PrintServerAuthClient | null = null;

// Initialize print server auth client (for external print servers only)
export function initializePrintServerAuth(config: {
  serverUrl: string;
  verifySSL?: boolean;
  tokenFile?: string;
  timeout?: number;
}): PrintServerAuthClient {
  printServerAuthClient = new PrintServerAuthClient(config);
  return printServerAuthClient;
}

// Get or create auth client with default config (for external print servers)
function getAuthClient(): PrintServerAuthClient {
  if (!printServerAuthClient) {
    printServerAuthClient = new PrintServerAuthClient({
      serverUrl: API_BASE,
      verifySSL: !import.meta.env.DEV, // Disable SSL verification in development
      tokenFile: '.print-server-token',
      timeout: 30000,
    });
  }
  return printServerAuthClient;
}

// Create axios instance for main app's print API endpoints
const printApi = axios.create({
  baseURL: getPrintApiBase(),
  timeout: 30000, // 30 seconds for print operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Use main app's authentication instead of print server auth
printApi.interceptors.request.use((config) => {
  const token = authGetToken();
  if (!token || authIsExpired(token)) {
    authLogout();
    return Promise.reject(new Error('Auth token missing/expired'));
  }
  authSchedule(token);
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle response errors with main app auth
printApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Print API Error:', error);
    if (error.response?.status === 401) {
      authLogout();
    }
    return Promise.reject(error);
  }
);

export class PrintApiService {
  // Note: Print server authentication methods removed - main app uses its own auth
  // Print server auth is only for external print clients, not the main app
  
  // Printer Discovery and Management
  static async discoverPrinters(): Promise<PrinterConfig[]> {
    try {
      const response: AxiosResponse<PrinterConfig[]> = await printApi.get('/printers/discover');
      return response.data;
    } catch (error) {
      console.error('Failed to discover printers:', error);
      throw new Error('Failed to discover printers');
    }
  }

  static async getPrinters(): Promise<PrinterConfig[]> {
    try {
      const response: AxiosResponse<PrinterConfig[]> = await printApi.get('/printers');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get printers:', error);
      
      // Return empty array to allow frontend to work gracefully
      console.warn('Print server unavailable, returning empty printers list');
      return [];
    }
  }

  /**
   * Check if a printer and its print client are online
   * Returns status info that can be used to warn users before submitting jobs
   */
  static async checkPrinterStatus(printerId: string): Promise<{
    printerOnline: boolean;
    clientOnline: boolean;
    printerName: string;
    clientName: string;
    message: string;
  }> {
    try {
      // Get printers - the /printers endpoint now returns real-time status
      // If printer.status is 'online', it means the client is actively polling AND the printer is online
      // If printer.status is 'offline', it could mean either the client is offline OR the printer is disconnected
      const printers = await this.getPrinters();
      
      const printer = printers.find(p => p.id === printerId);
      if (!printer) {
        console.warn(`checkPrinterStatus: Printer not found with id: ${printerId}`);
        return {
          printerOnline: false,
          clientOnline: false,
          printerName: 'Unknown',
          clientName: 'Unknown',
          message: 'Printer not found in system'
        };
      }
      
      // The printer status from /printers endpoint already reflects:
      // - Client online status (if client is offline, printer shows offline)
      // - Individual printer status (reported by print client)
      // So if printer.status === 'online', both the client AND printer are online
      const printerOnline = printer.status === 'online';
      
      // If the printer is online, the client must also be online (server logic ensures this)
      // If the printer is offline, we need to check if it's because the client is offline
      let clientOnline = printerOnline; // If printer is online, client is definitely online
      
      if (!printerOnline) {
        // Printer is offline - check if it's because the client is offline
        const activeClientsResponse = await this.getActivePollingClients();
        const clientId = printer.printClientId || printer.clientId;
        const activeClient = activeClientsResponse.clients.find(ac => ac.clientId === clientId);
        clientOnline = activeClient?.online === true;
      }
      
      // Debug logging
      console.log('checkPrinterStatus:', {
        printerId,
        printerName: printer.name,
        printerStatus: printer.status,
        printerOnline,
        clientOnline
      });
      
      let message = '';
      if (!clientOnline && !printerOnline) {
        message = `Print client and printer "${printer.name}" are both offline`;
      } else if (!clientOnline) {
        message = `Print client is offline - job will be queued but may not print until client comes online`;
      } else if (!printerOnline) {
        message = `Printer "${printer.name}" is offline - job will be queued but may fail when print client attempts to print`;
      }
      
      return {
        printerOnline,
        clientOnline,
        printerName: printer.name,
        clientName: 'Print Client',
        message
      };
    } catch (error) {
      console.error('Failed to check printer status:', error);
      return {
        printerOnline: false,
        clientOnline: false,
        printerName: 'Unknown',
        clientName: 'Unknown',
        message: 'Unable to check printer status'
      };
    }
  }

  static async addPrinter(printer: Omit<PrinterConfig, 'id' | 'status' | 'lastSeen'>): Promise<PrinterConfig> {
    try {
      const response: AxiosResponse<PrinterConfig> = await printApi.post('/printers', printer);
      return response.data;
    } catch (error) {
      console.error('Failed to add printer:', error);
      throw new Error('Failed to add printer');
    }
  }

  static async updatePrinter(id: string, updates: Partial<PrinterConfig>): Promise<PrinterConfig> {
    try {
      const response: AxiosResponse<PrinterConfig> = await printApi.put(`/printers/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update printer:', error);
      throw new Error('Failed to update printer');
    }
  }

  static async deletePrinter(id: string): Promise<void> {
    try {
      await printApi.delete(`/printers/${id}`);
    } catch (error) {
      console.error('Failed to delete printer:', error);
      throw new Error('Failed to delete printer');
    }
  }

  static async deleteAllPrinters(): Promise<{ deletedCount: number; message: string }> {
    try {
      const response: AxiosResponse<{ deletedCount: number; message: string }> = await printApi.delete('/printers');
      return response.data;
    } catch (error) {
      console.error('Failed to delete all printers:', error);
      throw new Error('Failed to delete all printers');
    }
  }

  static async cleanupDuplicatePrinters(): Promise<{ deletedCount: number; keptCount: number; message: string }> {
    try {
      const response: AxiosResponse<{ deletedCount: number; keptCount: number; message: string }> = await printApi.post('/printers/cleanup-duplicates');
      return response.data;
    } catch (error) {
      console.error('Failed to cleanup duplicate printers:', error);
      throw new Error('Failed to cleanup duplicate printers');
    }
  }

  // Printer Status Management - Get raw printer status from server
  // Note: Use checkPrinterStatus() above for pre-print status checks with printerOnline/clientOnline
  static async getRawPrinterStatus(printerId: string): Promise<PrinterStatus> {
    try {
      const response: AxiosResponse<PrinterStatus> = await printApi.get(`/printers/${printerId}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get raw printer status:', error);
      throw new Error('Failed to get raw printer status');
    }
  }

  static async checkAllPrinterStatus(): Promise<PrinterStatus[]> {
    try {
      const response: AxiosResponse<PrinterStatus[]> = await printApi.get('/printers/status');
      return response.data;
    } catch (error: any) {
      console.error('Failed to check all printer status:', error);
      
      // Return empty array to allow frontend to work gracefully
      console.warn('Print server unavailable, returning empty printer status');
      return [];
    }
  }

  static async pingPrinter(printerId: string): Promise<boolean> {
    try {
      const response: AxiosResponse<{ online: boolean }> = await printApi.post(`/printers/${printerId}/ping`);
      return response.data.online;
    } catch (error) {
      console.error('Failed to ping printer:', error);
      return false;
    }
  }

  // Configuration Management
  static async getConfigurations(): Promise<Record<string, PrintConfiguration>> {
    try {
      const response: AxiosResponse<Record<string, PrintConfiguration>> = await printApi.get('/configurations');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get configurations:', error);
      
      // If it's a 404, return empty configurations to allow the frontend to work
      if (error.response?.status === 404) {
        console.warn('Print configurations endpoint not found, returning empty configurations');
        return {};
      }
      
      // For other errors, also return empty to prevent crashes
      console.warn('Print server unavailable, returning empty configurations');
      return {};
    }
  }

  static async saveConfiguration(formName: string, config: PrintConfiguration): Promise<PrintConfiguration> {
    try {
      const response: AxiosResponse<PrintConfiguration> = await printApi.put(`/configurations/${formName}`, config);
      return response.data;
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error('Failed to save configuration');
    }
  }

  static async deleteConfiguration(formName: string): Promise<void> {
    try {
      await printApi.delete(`/configurations/${formName}`);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      throw new Error('Failed to delete configuration');
    }
  }

  // Print Job Management
  static async submitPrintJob(request: PrintJobRequest): Promise<PrintJob> {
    try {
      console.log('🚀 Submitting print job request:', {
        url: `${printApi.defaults.baseURL}/jobs`,
        method: 'POST',
        data: request,
        headers: printApi.defaults.headers
      });
      
      const response: AxiosResponse<PrintJob> = await printApi.post('/jobs', request);
      console.log('✅ Print job submitted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to submit print job:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        request: request,
        message: error.message
      });
      
      // Provide more detailed error information
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `HTTP ${error.response?.status}: ${error.response?.statusText}` ||
                          'Failed to submit print job';
      
      throw new Error(errorMessage);
    }
  }

  static async getPrintJobs(): Promise<PrintJob[]> {
    try {
      const response: AxiosResponse<PrintJob[]> = await printApi.get('/jobs');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get print jobs:', error);
      
      // Return empty array to allow frontend to work gracefully
      console.warn('Print server unavailable, returning empty print jobs');
      return [];
    }
  }

  static async getPrintJob(jobId: string): Promise<PrintJob> {
    try {
      const response: AxiosResponse<PrintJob> = await printApi.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get print job:', error);
      throw new Error('Failed to get print job');
    }
  }

  static async cancelPrintJob(jobId: string): Promise<void> {
    try {
      await printApi.delete(`/jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to cancel print job:', error);
      throw new Error('Failed to cancel print job');
    }
  }

  static async retryPrintJob(jobId: string): Promise<PrintJob> {
    try {
      const response: AxiosResponse<PrintJob> = await printApi.post(`/jobs/${jobId}/retry`);
      return response.data;
    } catch (error) {
      console.error('Failed to retry print job:', error);
      throw new Error('Failed to retry print job');
    }
  }

  static async getPrintJobStatus(jobId: string): Promise<PrintStatus> {
    try {
      const response: AxiosResponse<PrintStatus> = await printApi.get(`/jobs/${jobId}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get print job status:', error);
      throw new Error('Failed to get print job status');
    }
  }

  // Queue Management
  static async getPrintQueue(): Promise<PrintQueue> {
    try {
      const response: AxiosResponse<PrintQueue> = await printApi.get('/queue');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get print queue:', error);
      
      // Return empty queue to allow frontend to work gracefully
      console.warn('Print server unavailable, returning empty print queue');
      return { jobs: [], totalJobs: 0 };
    }
  }

  static async clearPrintQueue(): Promise<void> {
    try {
      await printApi.delete('/queue');
    } catch (error) {
      console.error('Failed to clear print queue:', error);
      throw new Error('Failed to clear print queue');
    }
  }

  static async reorderQueue(jobIds: string[]): Promise<PrintQueue> {
    try {
      const response: AxiosResponse<PrintQueue> = await printApi.put('/queue/reorder', { jobIds });
      return response.data;
    } catch (error) {
      console.error('Failed to reorder print queue:', error);
      throw new Error('Failed to reorder print queue');
    }
  }

  // Template Management
  static async getTemplates(): Promise<PrintTemplate[]> {
    try {
      const response: AxiosResponse<PrintTemplate[]> = await printApi.get('/templates');
      return response.data;
    } catch (error) {
      console.error('Failed to get templates:', error);
      throw new Error('Failed to get templates');
    }
  }

  static async getTemplatesByForm(formName: string): Promise<PrintTemplate[]> {
    try {
      const response: AxiosResponse<PrintTemplate[]> = await printApi.get(`/templates/form/${formName}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get templates for form:', error);
      throw new Error('Failed to get templates for form');
    }
  }

  static async createTemplate(template: Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PrintTemplate> {
    try {
      const response: AxiosResponse<PrintTemplate> = await printApi.post('/templates', template);
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error('Failed to create template');
    }
  }

  static async updateTemplate(id: string, updates: Partial<PrintTemplate>): Promise<PrintTemplate> {
    try {
      const response: AxiosResponse<PrintTemplate> = await printApi.put(`/templates/${id}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update template:', error);
      
      // Return empty template to allow frontend to work gracefully
      console.warn('Print server unavailable, returning empty template');
      throw new Error('Failed to update template');
    }
  }

  static async deleteTemplate(id: string): Promise<void> {
    try {
      await printApi.delete(`/templates/${id}`);
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      throw new Error('Failed to delete template');
    }
  }

  // Test and Utility Functions
  static async testPrint(printerId: string, testType: 'test-page' | 'alignment' | 'color' = 'test-page'): Promise<PrintJob> {
    try {
      const response: AxiosResponse<PrintJob> = await printApi.post(`/printers/${printerId}/test`, { testType });
      return response.data;
    } catch (error: any) {
      console.error('Failed to send test print:', error);
      throw new Error('Failed to send test print');
    }
  }

  static async previewPrint(formName: string, jobData: any): Promise<{ previewUrl: string }> {
    try {
      const response: AxiosResponse<{ previewUrl: string }> = await printApi.post('/preview', {
        formName,
        jobData
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to generate print preview:', error);
      throw new Error('Failed to generate print preview');
    }
  }

  // ========================
  // Print Client Management
  // ========================

  static async getPrintClients(locationId?: string): Promise<PrintClient[]> {
    try {
      const params = locationId ? { locationId } : {};
      const response: AxiosResponse<PrintClient[]> = await printApi.get('/clients', { params });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get print clients:', error);
      return [];
    }
  }

  // Get active polling clients (clients currently connected and polling)
  static async getActivePollingClients(): Promise<{
    clients: Array<{
      clientId: string;
      online: boolean;
      lastSeen: string | null;
      id: string | null;
      name: string;
      locationId: string | null;
      description: string | null;
    }>;
    totalActive: number;
    timestamp: string;
  }> {
    try {
      const response = await printApi.get('/clients/active');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get active polling clients:', error);
      return {
        clients: [],
        totalActive: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  static async getPrintClient(id: string): Promise<PrintClient> {
    try {
      const response: AxiosResponse<PrintClient> = await printApi.get(`/clients/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get print client:', error);
      throw new Error('Failed to get print client');
    }
  }

  static async getPrintClientsByLocation(locationId: string): Promise<PrintClientWithPrinters[]> {
    try {
      const response: AxiosResponse<PrintClientWithPrinters[]> = await printApi.get(`/clients/location/${locationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get print clients for location:', error);
      return [];
    }
  }

  static async createPrintClient(data: PrintClientFormData): Promise<PrintClient> {
    try {
      const response: AxiosResponse<PrintClient> = await printApi.post('/clients', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create print client:', error);
      if (error.response?.status === 409) {
        throw new Error('A print client with this ID already exists');
      }
      throw new Error('Failed to create print client');
    }
  }

  static async updatePrintClient(id: string, updates: Partial<PrintClientFormData>): Promise<PrintClient> {
    try {
      const response: AxiosResponse<PrintClient> = await printApi.put(`/clients/${id}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update print client:', error);
      throw new Error('Failed to update print client');
    }
  }

  // Upsert print client - creates if doesn't exist, updates if it does
  static async upsertPrintClient(clientId: string, data: Omit<PrintClientFormData, 'clientId'>): Promise<PrintClient> {
    try {
      const response: AxiosResponse<PrintClient> = await printApi.put(`/clients/upsert/${clientId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to upsert print client:', error);
      throw new Error('Failed to save print client');
    }
  }

  static async deletePrintClient(id: string): Promise<void> {
    try {
      await printApi.delete(`/clients/${id}`);
    } catch (error: any) {
      console.error('Failed to delete print client:', error);
      throw new Error('Failed to delete print client');
    }
  }

  static async getPrintClientPrinters(printClientId: string): Promise<PrinterConfig[]> {
    try {
      const response: AxiosResponse<PrinterConfig[]> = await printApi.get(`/clients/${printClientId}/printers`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get printers for client:', error);
      return [];
    }
  }

  // Get configurations for a specific location
  static async getConfigurationsForLocation(locationId: string): Promise<Record<string, PrintConfiguration>> {
    try {
      const response: AxiosResponse<Record<string, PrintConfiguration>> = await printApi.get(`/configurations/location/${locationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get configurations for location:', error);
      return {};
    }
  }

  // Save configuration with optional location scope
  static async saveConfigurationForLocation(
    formName: string, 
    config: PrintConfiguration, 
    locationId?: string
  ): Promise<PrintConfiguration> {
    try {
      const params = locationId ? { locationId } : {};
      const response: AxiosResponse<PrintConfiguration> = await printApi.put(
        `/configurations/${formName}`, 
        config,
        { params }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      throw new Error('Failed to save configuration');
    }
  }
}

export default PrintApiService;