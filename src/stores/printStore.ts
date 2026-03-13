import { create } from 'zustand';
import { 
  PrinterConfig, 
  PrintConfiguration, 
  PrintJob, 
  PrinterStatus, 
  PrintTemplate,
  PrintQueue,
  PrintMetrics,
  PrintNotificationSettings,
  PrintError,
  PrintClient,
  PrintClientWithPrinters
} from '../types/print';

interface PrintStore {
  // State
  printers: PrinterConfig[];
  configurations: Record<string, PrintConfiguration>; // keyed by formName
  jobs: PrintJob[];
  queue: PrintQueue;
  templates: PrintTemplate[];
  metrics: Record<string, PrintMetrics>; // keyed by formName
  notifications: PrintNotificationSettings;
  loading: boolean;
  error: string | null;
  
  // Print Client State
  printClients: PrintClient[];
  currentLocationClients: PrintClientWithPrinters[];
  selectedLocationId: string | null;
  
  // Current states
  activePrinter: PrinterConfig | null;
  currentJob: PrintJob | null;
  selectedForm: string | null;

  // Actions - Print Client Management
  setPrintClients: (clients: PrintClient[]) => void;
  addPrintClient: (client: PrintClient) => void;
  updatePrintClient: (id: string, updates: Partial<PrintClient>) => void;
  removePrintClient: (id: string) => void;
  setCurrentLocationClients: (clients: PrintClientWithPrinters[]) => void;
  setSelectedLocationId: (locationId: string | null) => void;
  getPrintClientsForLocation: (locationId: string) => PrintClient[];
  getOnlinePrintClients: () => PrintClient[];

  // Actions - Printer Management
  setPrinters: (printers: PrinterConfig[]) => void;
  addPrinter: (printer: PrinterConfig) => void;
  updatePrinter: (id: string, updates: Partial<PrinterConfig>) => void;
  removePrinter: (id: string) => void;
  setActivePrinter: (printer: PrinterConfig | null) => void;
  
  // Actions - Configuration Management
  setConfigurations: (configurations: Record<string, PrintConfiguration>) => void;
  setConfiguration: (formName: string, config: PrintConfiguration) => void;
  getConfiguration: (formName: string) => PrintConfiguration | null;
  removeConfiguration: (formName: string) => void;
  
  // Actions - Job Management
  setJobs: (jobs: PrintJob[]) => void;
  addJob: (job: PrintJob) => void;
  updateJob: (id: string, updates: Partial<PrintJob>) => void;
  removeJob: (id: string) => void;
  setCurrentJob: (job: PrintJob | null) => void;
  clearCompletedJobs: () => void;
  
  // Actions - Queue Management
  setQueue: (queue: PrintQueue) => void;
  addToQueue: (job: PrintJob) => void;
  removeFromQueue: (jobId: string) => void;
  clearQueue: () => void;
  reorderQueue: (jobIds: string[]) => void;
  
  // Actions - Template Management
  setTemplates: (templates: PrintTemplate[]) => void;
  addTemplate: (template: PrintTemplate) => void;
  updateTemplate: (id: string, updates: Partial<PrintTemplate>) => void;
  removeTemplate: (id: string) => void;
  getTemplatesByForm: (formName: string) => PrintTemplate[];
  
  // Actions - Metrics Management
  setMetrics: (metrics: Record<string, PrintMetrics>) => void;
  updateMetrics: (formName: string, metrics: Partial<PrintMetrics>) => void;
  incrementJobCount: (formName: string, success: boolean) => void;
  
  // Actions - Settings
  setNotifications: (settings: PrintNotificationSettings) => void;
  setSelectedForm: (formName: string | null) => void;
  
  // Actions - State Management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Utility Functions
  getOnlinePrinters: () => PrinterConfig[];
  getOfflinePrinters: () => PrinterConfig[];
  getPendingJobs: () => PrintJob[];
  getFailedJobs: () => PrintJob[];
  isFormConfigured: (formName: string) => boolean;
  getConfiguredForms: () => string[];
  
  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  reset: () => void;
}

const defaultNotifications: PrintNotificationSettings = {
  showSuccess: true,
  showErrors: true,
  showWarnings: true,
  soundEnabled: false,
  notificationDuration: 5000,
};

const defaultQueue: PrintQueue = {
  jobs: [],
  totalJobs: 0,
  processingJob: undefined,
  lastProcessed: undefined,
};

export const usePrintStore = create<PrintStore>((set, get) => ({
  // Initial state
  printers: [],
  configurations: {},
  jobs: [],
  queue: defaultQueue,
  templates: [],
  metrics: {},
  notifications: defaultNotifications,
  loading: false,
  error: null,
  activePrinter: null,
  currentJob: null,
  selectedForm: null,
  
  // Print Client State
  printClients: [],
  currentLocationClients: [],
  selectedLocationId: null,

  // Print Client Management
  setPrintClients: (clients) => set({ printClients: clients }),
  
  addPrintClient: (client) => set((state) => ({
    printClients: [...state.printClients, client]
  })),
  
  updatePrintClient: (id, updates) => set((state) => ({
    printClients: state.printClients.map(client =>
      client.id === id ? { ...client, ...updates } : client
    ),
    currentLocationClients: state.currentLocationClients.map(client =>
      client.id === id ? { ...client, ...updates } : client
    )
  })),
  
  removePrintClient: (id) => set((state) => ({
    printClients: state.printClients.filter(client => client.id !== id),
    currentLocationClients: state.currentLocationClients.filter(client => client.id !== id)
  })),
  
  setCurrentLocationClients: (clients) => set({ currentLocationClients: clients }),
  
  setSelectedLocationId: (locationId) => set({ selectedLocationId: locationId }),
  
  getPrintClientsForLocation: (locationId) => {
    const state = get();
    return state.printClients.filter(client => client.locationId === locationId);
  },
  
  getOnlinePrintClients: () => {
    const state = get();
    return state.printClients.filter(client => client.status === 'online');
  },

  // Printer Management
  setPrinters: (printers) => set({ printers }),
  
  addPrinter: (printer) => set((state) => ({
    printers: [...state.printers, printer]
  })),
  
  updatePrinter: (id, updates) => set((state) => ({
    printers: state.printers.map(printer => 
      printer.id === id ? { ...printer, ...updates } : printer
    )
  })),
  
  removePrinter: (id) => set((state) => ({
    printers: state.printers.filter(printer => printer.id !== id),
    activePrinter: state.activePrinter?.id === id ? null : state.activePrinter
  })),
  
  setActivePrinter: (printer) => set({ activePrinter: printer }),

  // Configuration Management
  setConfigurations: (configurations) => set({ configurations }),
  
  setConfiguration: (formName, config) => set((state) => ({
    configurations: { ...state.configurations, [formName]: config }
  })),
  
  getConfiguration: (formName) => {
    const state = get();
    return state.configurations[formName] || null;
  },
  
  removeConfiguration: (formName) => set((state) => {
    const { [formName]: removed, ...rest } = state.configurations;
    return { configurations: rest };
  }),

  // Job Management
  setJobs: (jobs) => set({ jobs }),
  
  addJob: (job) => set((state) => ({
    jobs: [...state.jobs, job]
  })),
  
  updateJob: (id, updates) => set((state) => ({
    jobs: state.jobs.map(job => 
      job.id === id ? { ...job, ...updates } : job
    )
  })),
  
  removeJob: (id) => set((state) => ({
    jobs: state.jobs.filter(job => job.id !== id),
    currentJob: state.currentJob?.id === id ? null : state.currentJob
  })),
  
  setCurrentJob: (job) => set({ currentJob: job }),
  
  clearCompletedJobs: () => set((state) => ({
    jobs: state.jobs.filter(job => 
      job.status !== 'completed' && job.status !== 'cancelled'
    )
  })),

  // Queue Management
  setQueue: (queue) => set({ queue }),
  
  addToQueue: (job) => set((state) => ({
    queue: {
      ...state.queue,
      jobs: [...state.queue.jobs, job],
      totalJobs: state.queue.totalJobs + 1
    }
  })),
  
  removeFromQueue: (jobId) => set((state) => ({
    queue: {
      ...state.queue,
      jobs: state.queue.jobs.filter(job => job.id !== jobId)
    }
  })),
  
  clearQueue: () => set({ queue: defaultQueue }),
  
  reorderQueue: (jobIds) => set((state) => {
    const reorderedJobs = jobIds.map(id => 
      state.queue.jobs.find(job => job.id === id)
    ).filter(Boolean) as PrintJob[];
    
    return {
      queue: { ...state.queue, jobs: reorderedJobs }
    };
  }),

  // Template Management
  setTemplates: (templates) => set({ templates }),
  
  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, template]
  })),
  
  updateTemplate: (id, updates) => set((state) => ({
    templates: state.templates.map(template => 
      template.id === id ? { ...template, ...updates } : template
    )
  })),
  
  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter(template => template.id !== id)
  })),
  
  getTemplatesByForm: (formName) => {
    const state = get();
    return state.templates.filter(template => template.formName === formName);
  },

  // Metrics Management
  setMetrics: (metrics) => set({ metrics }),
  
  updateMetrics: (formName, updates) => set((state) => ({
    metrics: {
      ...state.metrics,
      [formName]: { ...state.metrics[formName], ...updates }
    }
  })),
  
  incrementJobCount: (formName, success) => set((state) => {
    const current = state.metrics[formName] || {
      formName,
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averagePrintTime: 0,
      paperUsed: 0
    };
    
    return {
      metrics: {
        ...state.metrics,
        [formName]: {
          ...current,
          totalJobs: current.totalJobs + 1,
          successfulJobs: success ? current.successfulJobs + 1 : current.successfulJobs,
          failedJobs: success ? current.failedJobs : current.failedJobs + 1,
          lastPrinted: new Date()
        }
      }
    };
  }),

  // Settings
  setNotifications: (settings) => set({ notifications: settings }),
  setSelectedForm: (formName) => set({ selectedForm: formName }),

  // State Management
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Utility Functions
  getOnlinePrinters: () => {
    const state = get();
    return state.printers.filter(printer => printer.status === 'online');
  },
  
  getOfflinePrinters: () => {
    const state = get();
    return state.printers.filter(printer => printer.status === 'offline');
  },
  
  getPendingJobs: () => {
    const state = get();
    return state.jobs.filter(job => job.status === 'pending');
  },
  
  getFailedJobs: () => {
    const state = get();
    return state.jobs.filter(job => job.status === 'failed');
  },
  
  isFormConfigured: (formName) => {
    const state = get();
    return formName in state.configurations;
  },
  
  getConfiguredForms: () => {
    const state = get();
    return Object.keys(state.configurations);
  },

  // Persistence
  saveToStorage: () => {
    const state = get();
    try {
      localStorage.setItem('printConfigurations', JSON.stringify(state.configurations));
      localStorage.setItem('printNotifications', JSON.stringify(state.notifications));
      localStorage.setItem('printMetrics', JSON.stringify(state.metrics));
    } catch (error) {
      console.error('Failed to save print settings to localStorage:', error);
    }
  },
  
  loadFromStorage: () => {
    try {
      const configurations = localStorage.getItem('printConfigurations');
      const notifications = localStorage.getItem('printNotifications');
      const metrics = localStorage.getItem('printMetrics');
      
      if (configurations) {
        set({ configurations: JSON.parse(configurations) });
      }
      if (notifications) {
        set({ notifications: JSON.parse(notifications) });
      }
      if (metrics) {
        set({ metrics: JSON.parse(metrics) });
      }
    } catch (error) {
      console.error('Failed to load print settings from localStorage:', error);
    }
  },
  
  reset: () => set({
    printers: [],
    configurations: {},
    jobs: [],
    queue: defaultQueue,
    templates: [],
    metrics: {},
    notifications: defaultNotifications,
    loading: false,
    error: null,
    activePrinter: null,
    currentJob: null,
    selectedForm: null,
    printClients: [],
    currentLocationClients: [],
    selectedLocationId: null
  })
})); 