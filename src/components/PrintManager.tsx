import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Badge,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
  Snackbar,
  Paper,
  
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';

import Grid from './CustomGrid';
import {
  Print as PrintIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Queue as QueueIcon,
  ExpandMore as ExpandMoreIcon,
  NetworkCheck as NetworkCheckIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  BugReport as BugReportIcon,
  Timer as TimerIcon,
  Computer as ComputerIcon,
  PlaylistPlay as PlaylistPlayIcon,
  Analytics as AnalyticsIcon,
  Clear as ClearIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';

import { usePrintStore } from '../stores/printStore';
import PrintApiService from '../services/printApi';
import { useNotification } from '../hooks/useNotification';
import { 
  PrinterConfig, 
  PrintConfiguration, 
  PrintJobRequest,
  PrintJob,
  PrinterStatus 
} from '../types/print';
import PrintServerAuthSettings from './PrintServerAuthSettings';
import { debug } from '../services/debugManager';

// Enhanced logging utility for PrintManager
class PrintManagerLogger {
  private static instance: PrintManagerLogger;
  private logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    category: 'component' | 'api' | 'state' | 'user' | 'store';
    message: string;
    data?: any;
  }> = [];

  static getInstance(): PrintManagerLogger {
    if (!PrintManagerLogger.instance) {
      PrintManagerLogger.instance = new PrintManagerLogger();
    }
    return PrintManagerLogger.instance;
  }

  log(level: 'info' | 'warn' | 'error' | 'debug', category: 'component' | 'api' | 'state' | 'user' | 'store', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data
    };
    
    this.logs.unshift(logEntry);
    
    // Keep only last 200 logs
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(0, 200);
    }

    // Use central debug manager for console output
    const debugCategory = category === 'api' ? 'print' : 'print';
    const fullMessage = `[PrintManager:${category}] ${message}`;
    
    switch (level) {
      case 'error':
        debug.error(debugCategory, fullMessage, data);
        break;
      case 'warn':
        debug.warn(debugCategory, fullMessage, data);
        break;
      case 'info':
      case 'debug':
      default:
        debug.log(debugCategory, fullMessage, data);
        break;
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.log('info', 'component', 'Logs cleared by user');
  }

  exportLogs() {
    const logsText = this.logs.map(log => 
      `${log.timestamp.toISOString()} [${log.level.toUpperCase()}:${log.category}] ${log.message}${log.data ? ' | Data: ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printmanager-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

interface PrintManagerProps {
  formName?: string; // Current form context
  onPrintComplete?: (job: PrintJob) => void;
  onPrintError?: (error: string) => void;
  compactMode?: boolean; // For embedding in other components
  defaultExpanded?: boolean;
}

interface DebugInfo {
  pollCount: number;
  lastPoll: Date | null;
  apiCallCount: number;
  connectedPrinters: number;
  activePrints: number;
  pendingJobs: number;
  errorCount: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastError: string | null;
  averageResponseTime: number;
}

interface ErrorLog {
  timestamp: Date;
  message: string;
  type: 'api' | 'printer' | 'job' | 'connection';
}

const PrintManager: React.FC<PrintManagerProps> = ({
  formName,
  onPrintComplete,
  onPrintError,
  compactMode = false,
  defaultExpanded = false
}) => {
  const logger = PrintManagerLogger.getInstance();
  
  // Log component initialization
  useEffect(() => {
    logger.log('info', 'component', 'PrintManager component mounted', {
      formName,
      compactMode,
      defaultExpanded
    });
    
    return () => {
      logger.log('info', 'component', 'PrintManager component unmounted');
    };
  }, []);

  const {
    printers,
    configurations,
    loading,
    error,
    activePrinter,
    selectedForm,
    setPrinters,
    setConfigurations,
    setConfiguration,
    getConfiguration,
    setActivePrinter,
    setSelectedForm,
    setLoading,
    setError,
    clearError,
    addJob,
    incrementJobCount,
    loadFromStorage,
    saveToStorage
  } = usePrintStore();

  const { showNotification } = useNotification();

  // Local state with logging
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [printerDiscoveryOpen, setDiscoveryOpen] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [printerStatuses, setPrinterStatuses] = useState<Record<string, PrinterStatus>>({});
  const [currentConfig, setCurrentConfig] = useState<Partial<PrintConfiguration>>({});
  const [printProgress, setPrintProgress] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [queueData, setQueueData] = useState<any[]>([]);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [testOptionsOpen, setTestOptionsOpen] = useState<string | null>(null);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    pollCount: 0,
    lastPoll: null,
    apiCallCount: 0,
    connectedPrinters: 0,
    activePrints: 0,
    pendingJobs: 0,
    errorCount: 0,
    connectionStatus: 'disconnected',
    lastError: null,
    averageResponseTime: 0,
  });
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugPolling, setDebugPolling] = useState(true);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [componentLogs, setComponentLogs] = useState(logger.getLogs());

  // Use provided formName or selected form
  const currentFormName = formName || selectedForm;

  // Log state changes
  useEffect(() => {
    logger.log('debug', 'state', 'Printers state changed', { 
      count: printers.length,
      printers: printers.map(p => ({ id: p.id, name: p.name, status: p.status }))
    });
  }, [printers]);

  useEffect(() => {
    logger.log('debug', 'state', 'Configurations state changed', { 
      configCount: Object.keys(configurations).length,
      forms: Object.keys(configurations)
    });
  }, [configurations]);

  useEffect(() => {
    logger.log('debug', 'state', 'Loading state changed', { loading });
  }, [loading]);

  useEffect(() => {
    logger.log('debug', 'state', 'Error state changed', { error });
  }, [error]);

  useEffect(() => {
    logger.log('debug', 'state', 'Selected form changed', { 
      previousForm: selectedForm,
      newForm: currentFormName,
      formSource: formName ? 'prop' : 'store'
    });
  }, [currentFormName, selectedForm, formName]);

  // Stable handler for form selection to prevent re-renders
  const handleFormChange = useCallback((value: string) => {
    logger.log('info', 'user', 'Form selection changed', { 
      previousForm: currentFormName,
      newForm: value 
    });
    setSelectedForm(value || null);
  }, [setSelectedForm, currentFormName]);

  // Helper to track API response times
  const trackApiCall = useCallback((duration: number) => {
    logger.log('debug', 'api', 'API call completed', { 
      duration: `${duration.toFixed(2)}ms`,
      endpoint: 'unknown' 
    });
    
    setDebugInfo(prev => ({
      ...prev,
      apiCallCount: prev.apiCallCount + 1,
      pollCount: prev.pollCount + 1,
      lastPoll: new Date(),
    }));
    
    setResponseTimes(prev => {
      const newTimes = [...prev, duration].slice(-10); // Keep last 10 response times
      const average = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length;
      
      setDebugInfo(current => ({
        ...current,
        averageResponseTime: Math.round(average),
      }));
      
      return newTimes;
    });
  }, []);

  // Helper to log errors with smart deduplication
  const logError = useCallback((message: string, type: ErrorLog['type'], details?: any) => {
    logger.log('error', 'api', message, details);
    
    const error: ErrorLog = {
      timestamp: new Date(),
      message,
      type,
    };
    
    setErrorLogs(prev => {
      // Check if the last error is the same type and message (avoid spam)
      const lastError = prev[0];
      if (lastError && 
          lastError.type === type && 
          lastError.message === message &&
          (new Date().getTime() - lastError.timestamp.getTime()) < 10000) { // Within 10 seconds
        return prev; // Don't add duplicate
      }
      return [error, ...prev].slice(0, 50); // Keep last 50 errors
    });
    
    setDebugInfo(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      lastError: message,
      connectionStatus: 'error',
    }));
  }, []);

  // Load printers from API with debug tracking
  const loadPrinters = useCallback(async () => {
    const startTime = performance.now();
    logger.log('info', 'api', 'Starting loadPrinters request');
    
    try {
      setLoading(true);
      logger.log('debug', 'state', 'Set loading to true');
      
      // Try to load printers and configurations gracefully
      logger.log('debug', 'api', 'Making parallel requests for printers and configurations');
      const [printersResult, configsResult] = await Promise.allSettled([
        PrintApiService.getPrinters().catch((err) => {
          logger.log('warn', 'api', 'getPrinters failed', err);
          return [];
        }),
        PrintApiService.getConfigurations().catch((err) => {
          logger.log('warn', 'api', 'getConfigurations failed', err);
          return {};
        })
      ]);
      
      const printersData = printersResult.status === 'fulfilled' ? printersResult.value : [];
      const configsData = configsResult.status === 'fulfilled' ? configsResult.value : {};
      
      logger.log('info', 'api', 'Printer data loaded', {
        printersCount: printersData.length,
        configurationsCount: Object.keys(configsData).length,
        printers: printersData.map(p => ({ id: p.id, name: p.name, status: p.status })),
        configurations: Object.keys(configsData)
      });
      
      setPrinters(printersData);
      setConfigurations(configsData);
      
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: 'connected',
      }));
      
      logger.log('info', 'api', 'loadPrinters completed successfully', {
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });
      
    } catch (err) {
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      logger.log('error', 'api', 'loadPrinters failed', err);
      setError('Failed to load printers');
      showNotification('Print server not available - debug mode only', 'warning');
      logError('Failed to load printers', 'api', err);
      
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: 'error',
      }));
    } finally {
      setLoading(false);
      logger.log('debug', 'state', 'Set loading to false');
    }
  }, [trackApiCall, logError, setPrinters, setConfigurations, setLoading, setError, showNotification]);

  // Stable handler for auth changes to prevent re-renders
  const handleAuthChange = useCallback((isAuthenticated: boolean) => {
    logger.log('info', 'user', 'Authentication state changed', { isAuthenticated });
    if (isAuthenticated) {
      logger.log('info', 'component', 'Reloading printers after authentication');
      loadPrinters(); // Reload printers when authenticated
    }
  }, [loadPrinters]);

  // Check printer status with debug tracking
  const checkAllPrinterStatus = useCallback(async () => {
    const startTime = performance.now();
    logger.log('debug', 'api', 'Checking all printer status');
    
    try {
      const statuses = await PrintApiService.checkAllPrinterStatus();
      const statusMap = statuses.reduce((acc, status) => {
        acc[status.printerId] = status;
        return acc;
      }, {} as Record<string, PrinterStatus>);
      setPrinterStatuses(statusMap);
      
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      // Update debug info
      const connectedCount = statuses.filter(s => s.status === 'online').length;
      logger.log('debug', 'api', 'Printer status check completed', {
        totalPrinters: statuses.length,
        onlinePrinters: connectedCount,
        offlinePrinters: statuses.length - connectedCount,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });
      
      setDebugInfo(prev => ({
        ...prev,
        connectedPrinters: connectedCount,
        connectionStatus: connectedCount > 0 ? 'connected' : 'disconnected',
      }));
    } catch (err) {
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      console.error('Failed to check printer status:', err);
      const errorMessage = err instanceof Error 
        ? `Printer status check failed: ${err.message}` 
        : 'Failed to check printer status';
      logError(errorMessage, 'printer', err);
      
      // Set default values when API fails
      setDebugInfo(prev => ({
        ...prev,
        connectedPrinters: 0,
        connectionStatus: 'error',
      }));
    }
  }, [trackApiCall, logError]);

  // Discover new printers
  const discoverPrinters = async () => {
    logger.log('info', 'user', 'User initiated printer discovery');
    try {
      setLoading(true);
      const discoveredPrinters = await PrintApiService.discoverPrinters();
      
      // Merge discovered printers with existing ones and remove duplicates
      const existingPrinterIds = new Set(printers.map(p => p.id));
      const newPrinters = discoveredPrinters.filter(printer => !existingPrinterIds.has(printer.id));
      const updatedPrinters = [...printers];
      
      // Update existing printers with new data if they exist
      discoveredPrinters.forEach(discoveredPrinter => {
        const existingIndex = updatedPrinters.findIndex(p => p.id === discoveredPrinter.id);
        if (existingIndex !== -1) {
          // Update existing printer with latest data
          updatedPrinters[existingIndex] = {
            ...updatedPrinters[existingIndex],
            ...discoveredPrinter,
            lastSeen: new Date()
          };
        }
      });
      
      // Add truly new printers
      const finalPrinters = [...updatedPrinters, ...newPrinters];
      setPrinters(finalPrinters);
      
      logger.log('info', 'api', 'Printer discovery completed', {
        discoveredCount: discoveredPrinters.length,
        newCount: newPrinters.length,
        totalCount: finalPrinters.length,
        printers: discoveredPrinters.map(p => ({ id: p.id, name: p.name }))
      });
      
      if (newPrinters.length > 0) {
        showNotification(`Discovered ${newPrinters.length} new printers (${discoveredPrinters.length} total found)`, 'success');
      } else {
        showNotification(`No new printers found (${discoveredPrinters.length} existing printers updated)`, 'info');
      }
    } catch (err) {
      logger.log('error', 'api', 'Printer discovery failed', err);
      setError('Failed to discover printers');
      showNotification('Failed to discover printers', 'error');
    } finally {
      setLoading(false);
      setDiscoveryOpen(false);
    }
  };

  // Clear all printers
  const clearAllPrinters = async () => {
    logger.log('info', 'user', 'User initiated clear all printers');
    try {
      setLoading(true);
      const frontendCount = printers.length;
      
      // Delete all printers from the server database
      const result = await PrintApiService.deleteAllPrinters();
      
      // Clear frontend state
      setPrinters([]);
      setPrinterStatuses({});
      
      logger.log('info', 'api', 'All printers cleared from server and frontend', {
        frontendCount,
        serverDeletedCount: result.deletedCount
      });
      
      showNotification(`Successfully deleted ${result.deletedCount} printers from the database`, 'success');
    } catch (err) {
      logger.log('error', 'api', 'Failed to clear printers', err);
      setError('Failed to clear printers');
      showNotification('Failed to clear printers from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clean up duplicate printers
  const cleanupDuplicatePrinters = async () => {
    logger.log('info', 'user', 'User initiated cleanup duplicate printers');
    try {
      setLoading(true);
      
      // Clean up duplicates on the server
      const result = await PrintApiService.cleanupDuplicatePrinters();
      
      // Reload printers from server to reflect changes
      await loadPrinters();
      
      logger.log('info', 'api', 'Duplicate printers cleaned up', {
        deletedCount: result.deletedCount,
        keptCount: result.keptCount
      });
      
      if (result.deletedCount > 0) {
        showNotification(`Cleaned up ${result.deletedCount} duplicate printers, kept ${result.keptCount} unique printers`, 'success');
      } else {
        showNotification('No duplicate printers found to clean up', 'info');
      }
    } catch (err) {
      logger.log('error', 'api', 'Failed to cleanup duplicate printers', err);
      setError('Failed to cleanup duplicate printers');
      showNotification('Failed to cleanup duplicate printers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize component
  useEffect(() => {
    logger.log('info', 'component', 'Initializing PrintManager component');
    loadFromStorage();
    if (formName) {
      logger.log('debug', 'component', 'Setting form from prop', { formName });
      setSelectedForm(formName);
    }
  }, [formName, loadFromStorage, setSelectedForm]);

  // Auto-save configuration changes
  useEffect(() => {
    if (Object.keys(configurations).length > 0) {
      logger.log('debug', 'store', 'Auto-saving configurations to storage');
      saveToStorage();
    }
  }, [configurations, saveToStorage]);

  // Load initial data after functions are defined
  useEffect(() => {
    logger.log('info', 'component', 'Loading initial printer data');
    loadPrinters();
    checkAllPrinterStatus();
  }, [loadPrinters, checkAllPrinterStatus]);

  // Load queue data
  const loadQueueData = useCallback(async () => {
    const startTime = performance.now();
    logger.log('debug', 'api', 'Loading queue data');
    
    try {
      const queue = await PrintApiService.getPrintQueue();
      setQueueData(queue.jobs || []);
      
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      logger.log('info', 'api', 'Queue data loaded successfully', {
        queueLength: queue.jobs?.length || 0,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });
    } catch (err) {
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      logger.log('error', 'api', 'Failed to load queue data', err);
      setQueueData([]);
      logError('Failed to load queue data', 'api', err);
    }
  }, [trackApiCall, logError]);

  // Clear specific queue item
  const clearQueueItem = useCallback(async (jobId: string) => {
    logger.log('info', 'user', 'User clearing queue item', { jobId });
    
    try {
      await PrintApiService.cancelPrintJob(jobId);
      await loadQueueData(); // Refresh queue
      
      logger.log('info', 'api', 'Queue item cleared successfully', { jobId });
      showNotification('Print job cancelled', 'success');
    } catch (err) {
      logger.log('error', 'api', 'Failed to clear queue item', { jobId, error: err });
      showNotification('Failed to cancel print job', 'error');
    }
  }, [loadQueueData, showNotification]);

  // Clear all queue items
  const clearAllQueue = useCallback(async () => {
    logger.log('info', 'user', 'User clearing entire queue');
    
    try {
      setClearingQueue(true);
      
      // Use the dedicated clear queue API
      await PrintApiService.clearPrintQueue();
      await loadQueueData(); // Refresh queue
      
      logger.log('info', 'api', 'All queue items cleared successfully');
      showNotification('All print jobs cancelled', 'success');
    } catch (err) {
      logger.log('error', 'api', 'Failed to clear all queue items', err);
      showNotification('Failed to clear all print jobs', 'error');
    } finally {
      setClearingQueue(false);
    }
  }, [loadQueueData, showNotification]);

  // Update debug info with print queue and job data
  const updateDebugInfo = useCallback(async () => {
    const startTime = performance.now();
    logger.log('debug', 'api', 'Updating debug info from API');
    
    try {
      // Try to get print queue and jobs, but handle failures gracefully
      const [queueResult, jobsResult] = await Promise.allSettled([
        PrintApiService.getPrintQueue().catch(() => ({ jobs: [] })),
        PrintApiService.getPrintJobs().catch(() => [])
      ]);
      
      const queue = queueResult.status === 'fulfilled' ? queueResult.value : { jobs: [] };
      const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];
      
      const activePrints = jobs.filter(job => 
        job.status === 'printing'
      ).length;
      
      const pendingJobs = queue.jobs?.length || 0;
      
      // Update queue data if queue dialog is open
      if (queueDialogOpen && queueResult.status === 'fulfilled') {
        setQueueData(queue.jobs || []);
      }
      
      logger.log('debug', 'api', 'Debug info updated', {
        activePrints,
        pendingJobs,
        totalJobs: jobs.length
      });
      
      setDebugInfo(prev => ({
        ...prev,
        activePrints,
        pendingJobs,
      }));
      
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
    } catch (err) {
      const endTime = performance.now();
      trackApiCall(endTime - startTime);
      
      logError('Failed to update debug info', 'api', err);
      
      // Set default values when API fails
      setDebugInfo(prev => ({
        ...prev,
        activePrints: 0,
        pendingJobs: 0,
      }));
    }
  }, [trackApiCall, logError, queueDialogOpen]);

  // Debug polling effect with adaptive frequency
  useEffect(() => {
    if (!debugPolling) {
      logger.log('debug', 'component', 'Debug polling disabled');
      return;
    }

    // Adjust polling frequency based on connection status
    const getPollingInterval = () => {
      switch (debugInfo.connectionStatus) {
        case 'error':
          return 15000; // Slow down when errors detected (15s)
        case 'disconnected':
          return 10000; // Medium frequency for disconnected (10s)
        case 'connected':
        default:
          return 5000; // Normal frequency for connected (5s)
      }
    };

    const interval = getPollingInterval();
    logger.log('debug', 'component', 'Starting debug polling', { 
      interval: `${interval}ms`,
      status: debugInfo.connectionStatus 
    });

    const intervalId = setInterval(async () => {
      logger.log('debug', 'component', 'Debug polling tick');
      await updateDebugInfo();
      await checkAllPrinterStatus();
    }, interval);

    return () => {
      logger.log('debug', 'component', 'Stopping debug polling');
      clearInterval(intervalId);
    };
  }, [debugPolling, updateDebugInfo, checkAllPrinterStatus]);

  // Update component logs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setComponentLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Clear debug logs
  const clearDebugLogs = useCallback(() => {
    logger.log('info', 'user', 'User cleared debug logs');
    setErrorLogs([]);
    setDebugInfo(prev => ({
      ...prev,
      errorCount: 0,
      lastError: null,
    }));
    logger.clearLogs();
    setComponentLogs([]);
  }, []);

  // Reset debug counters
  const resetDebugCounters = useCallback(() => {
    logger.log('info', 'user', 'User reset debug counters');
    setDebugInfo(prev => ({
      ...prev,
      pollCount: 0,
      apiCallCount: 0,
      errorCount: 0,
      lastError: null,
    }));
    setResponseTimes([]);
    setErrorLogs([]);
  }, []);

  // Export logs
  const exportLogs = useCallback(() => {
    logger.log('info', 'user', 'User exported logs');
    logger.exportLogs();
  }, []);

  // Open queue dialog and load data
  const openQueueDialog = useCallback(() => {
    logger.log('info', 'user', 'User opened queue dialog');
    setQueueDialogOpen(true);
    loadQueueData();
  }, [loadQueueData]);

  // Main print function
  const triggerPrint = async (jobData: any, options?: PrintJobRequest['options']) => {
    logger.log('info', 'user', 'User triggered print', { 
      formName: currentFormName,
      hasJobData: !!jobData,
      options 
    });
    
    if (!currentFormName) {
      const message = 'No form selected for printing';
      logger.log('warn', 'component', message);
      setError(message);
      onPrintError?.(message);
      return;
    }

    const config = getConfiguration(currentFormName);
    if (!config) {
      const message = `No print configuration found for ${currentFormName}`;
      logger.log('warn', 'component', message);
      setError(message);
      onPrintError?.(message);
      return;
    }

    const printer = printers.find(p => p.id === config.printerId);
    if (!printer) {
      const message = 'Configured printer not found';
      logger.log('warn', 'component', message, { 
        configuredPrinterId: config.printerId,
        availablePrinters: printers.map(p => ({ id: p.id, name: p.name }))
      });
      setError(message);
      onPrintError?.(message);
      return;
    }

    // Check if printer is online
    const status = printerStatuses[printer.id];
    if (status && status.status !== 'online') {
      const message = `Printer ${printer.name} is ${status.status}`;
      logger.log('warn', 'component', message, { 
        printerId: printer.id,
        printerName: printer.name,
        status: status.status 
      });
      setError(message);
      onPrintError?.(message);
      return;
    }

    try {
      setLoading(true);
      logger.log('info', 'api', 'Submitting print job', {
        formName: currentFormName,
        printerId: printer.id,
        printerName: printer.name
      });
      
      const job = await PrintApiService.submitPrintJob({
        formName: currentFormName,
        jobData,
        options
      });

      addJob(job);
      incrementJobCount(currentFormName, true);
      logger.log('info', 'api', 'Print job submitted successfully', { 
        jobId: job.id,
        status: job.status 
      });
      showNotification('Print job submitted successfully', 'success');
      onPrintComplete?.(job);

      // Handle second copy confirmation if needed
      if (options?.confirmSecondCopy && job.status === 'completed') {
        setTimeout(() => {
          if (window.confirm('Print a second copy?')) {
            logger.log('info', 'user', 'User confirmed second copy print');
            triggerPrint(jobData, { ...options, confirmSecondCopy: false });
          } else {
            logger.log('info', 'user', 'User declined second copy print');
          }
        }, 1000);
      }

    } catch (err) {
      const message = 'Failed to submit print job';
      logger.log('error', 'api', message, err);
      setError(message);
      onPrintError?.(message);
      incrementJobCount(currentFormName, false);
      showNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Configuration management
  const openConfigDialog = () => {
    logger.log('info', 'user', 'User opened configuration dialog', { 
      formName: currentFormName 
    });
    const existing = getConfiguration(currentFormName || '');
    setCurrentConfig(existing || {
      formName: currentFormName || '',
      printerId: '',
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      copies: 1,
      quality: 'normal',
      colorMode: 'color',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    setConfigDialogOpen(true);
  };

  const saveConfiguration = async () => {
    logger.log('info', 'user', 'User saving configuration', { 
      formName: currentFormName,
      printerId: currentConfig.printerId 
    });
    
    if (!currentFormName || !currentConfig.printerId) {
      logger.log('warn', 'component', 'Cannot save configuration - missing data', {
        formName: currentFormName,
        printerId: currentConfig.printerId
      });
      showNotification('Please select a printer', 'error');
      return;
    }

    try {
      const config: PrintConfiguration = {
        ...currentConfig,
        formName: currentFormName,
        updatedAt: new Date()
      } as PrintConfiguration;

      await PrintApiService.saveConfiguration(currentFormName, config);
      setConfiguration(currentFormName, config);
      logger.log('info', 'api', 'Configuration saved successfully', { 
        formName: currentFormName,
        config 
      });
      showNotification('Configuration saved', 'success');
      setConfigDialogOpen(false);
    } catch (err) {
      logger.log('error', 'api', 'Failed to save configuration', err);
      showNotification('Failed to save configuration', 'error');
    }
  };

  // Test print with multiple test types - now uses job queue
  const testPrint = async (printerId: string, printerName?: string, testType: 'test-page' | 'alignment' | 'color' = 'test-page') => {
    const printer = printers.find(p => p.id === printerId);
    const name = printerName || printer?.name || 'Unknown Printer';
    
    const testTypeLabels = {
      'test-page': 'diagnostic test page',
      'alignment': 'alignment test page',
      'color': 'color test page'
    };
    
    logger.log('info', 'user', 'User initiated queued test print', { 
      printerId,
      printerName: name,
      testType 
    });
    
    try {
      setTestPrintLoading(true);
      
            // Check printer status first
      const status = printerStatuses[printerId];
      if (status && status.status !== 'online') {
        const message = `Cannot test print - ${name} is ${status.status}`;
        logger.log('warn', 'component', message);
        showNotification(message, 'warning');
        return;
      }
      
      // Use current configured form or fall back to a default
      const testFormName = currentFormName || 'test-print'; 
      
      // Check if we have a configuration for the target form
      let config = getConfiguration(testFormName);
      
      // If no configuration exists, create a temporary one for test printing
      if (!config) {
        logger.log('info', 'component', 'No configuration found, creating temporary test configuration', {
          testFormName,
          printerId
        });
        
        config = {
          formName: testFormName,
          printerId: printerId,
          paperSize: 'A4',
          orientation: 'portrait',
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          copies: 1,
          quality: 'normal',
          colorMode: 'color',
          customSettings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        } as PrintConfiguration;
        
        logger.log('info', 'component', 'Using temporary test configuration', { config });
      }
      
      // Create a test print job that will be queued for the print client
      const testJobData = {
         testType: testType,
         printerName: name,
         printerId: printerId, // Include printer ID in job data for client to use
         timestamp: new Date().toISOString(),
         isTestJob: true, // Mark as test job for client handling
         clientInfo: {
           userAgent: navigator.userAgent,
           platform: navigator.platform,
           language: navigator.language
         },
         testContent: {
           title: `${testTypeLabels[testType].toUpperCase()}`,
           subtitle: `Test for ${name}`,
           details: [
             `Test Type: ${testType}`,
             `Printer: ${name}`,
             `Generated: ${new Date().toLocaleString()}`,
             `Printer ID: ${printerId}`,
             `Job ID: Will be assigned by server`
           ]
         }
       };
       
       // Submit as a queued print job instead of direct test  
       const job = await PrintApiService.submitPrintJob({
         formName: testFormName, // Use existing configured form
         jobData: testJobData,
         options: {
           priority: 'high',
           copies: 1
         }
       });

      // Add to our job tracking
      addJob(job);
      logger.log('info', 'api', 'Test print job queued successfully', { 
        jobId: job.id,
        printerId, 
        printerName: name, 
        testType,
        status: job.status
      });
      showNotification(
        `${testTypeLabels[testType]} queued for ${name} (Job: ${job.id.slice(0, 8)}...)`, 
        'success'
      );
    } catch (err) {
      logger.log('error', 'api', 'Test print job failed', { 
        printerId, 
        printerName: name, 
        testType,
        error: err 
      });
      showNotification(`Failed to queue ${testTypeLabels[testType]} for ${name}`, 'error');
    } finally {
      setTestPrintLoading(false);
    }
  };

  // Get printer status chip
  const getPrinterStatusChip = (printer: PrinterConfig) => {
    const status = printerStatuses[printer.id];
    if (!status) {
      return <Chip label="Unknown" color="default" size="small" />;
    }

    const statusProps = {
      online: { label: 'Online', color: 'success' as const, icon: <CheckCircleIcon /> },
      offline: { label: 'Offline', color: 'error' as const, icon: <ErrorIcon /> },
      error: { label: 'Error', color: 'error' as const, icon: <WarningIcon /> },
      unknown: { label: 'Unknown', color: 'default' as const, icon: <WarningIcon /> }
    };

    const props = statusProps[status.status];
    return (
      <Tooltip title={status.lastError || `Last seen: ${status.lastPing.toLocaleString()}`}>
        <Chip 
          label={props.label} 
          color={props.color} 
          size="small" 
          icon={props.icon}
        />
      </Tooltip>
    );
  };

  // Check if current form is configured
  const isConfigured = currentFormName ? getConfiguration(currentFormName) !== null : false;

  if (compactMode) {
    return (
      <Box sx={{ minWidth: 200 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => currentFormName && triggerPrint({})}
            disabled={!isConfigured || loading}
            size="small"
          >
            Print
          </Button>
          
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
            title="Settings"
          >
            <SettingsIcon />
          </IconButton>

          <IconButton
            onClick={openQueueDialog}
            size="small"
            title={`Print Queue (${debugInfo.pendingJobs})`}
          >
            <Badge badgeContent={debugInfo.pendingJobs} color="warning">
              <QueueIcon />
            </Badge>
          </IconButton>

          {isConfigured && (
            <Badge color={isConfigured ? 'success' : 'error'} variant="dot">
              <NetworkCheckIcon fontSize="small" />
            </Badge>
          )}
        </Stack>

        {expanded && (
          <Paper sx={{ mt: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Print Settings
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={openConfigDialog}
              size="small"
            >
              Configure Printer
            </Button>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Card sx={{ width: '100%', maxWidth: 800 }}>
      <CardHeader
        title="Print Manager"
        subtitle={currentFormName ? `Form: ${currentFormName}` : 'No form selected'}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={checkAllPrinterStatus} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={openConfigDialog}
              disabled={loading || printers.length === 0}
              color="primary"
            >
              Configure Printer
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDiscoveryOpen(true)}
              disabled={loading}
            >
              Discover Printers
            </Button>
            {printers.length > 5 && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<DeleteIcon />}
                onClick={cleanupDuplicatePrinters}
                disabled={loading}
              >
                Remove Duplicates
              </Button>
            )}
            {printers.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={clearAllPrinters}
                disabled={loading}
              >
                Clear All ({printers.length})
              </Button>
            )}
          </Box>
        }
      />

      <CardContent>
        {error && (
          <Alert 
            severity="error" 
            onClose={clearError}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Form Selection */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Form/Table</InputLabel>
              <Select
                value={currentFormName || ''}
                onChange={(e) => handleFormChange(e.target.value)}
                label="Form/Table"
              >
                <MenuItem value="">Select a form</MenuItem>
                <MenuItem value="labels">Labels</MenuItem>
                <MenuItem value="oil-stickers">Oil Stickers</MenuItem>
                <MenuItem value="receipts">Receipts</MenuItem>
                <MenuItem value="inspection-reports">Inspection Reports</MenuItem>
                <MenuItem value="invoices">Invoices</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => triggerPrint({})}
                disabled={!isConfigured || loading}
                size="large"
              >
                Print Now
              </Button>

              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={openConfigDialog}
                disabled={!currentFormName}
              >
                Configure
              </Button>

              <Button
                variant="outlined"
                startIcon={<QueueIcon />}
                onClick={openQueueDialog}
                color="info"
              >
                Queue ({debugInfo.pendingJobs})
              </Button>

              {isConfigured && (
                <Chip 
                  label="Configured" 
                  color="success" 
                  icon={<CheckCircleIcon />} 
                />
              )}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Print Server Authentication */}
        <PrintServerAuthSettings 
          defaultExpanded={false}
          compactMode={false}
          onAuthChange={handleAuthChange}
        />

        <Divider sx={{ my: 3 }} />

        {/* Debug Information */}
        <Accordion expanded={debugExpanded} onChange={() => setDebugExpanded(!debugExpanded)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
              <BugReportIcon color="primary" />
              <Typography variant="h6">Debug Information & Logs</Typography>
              <Box sx={{ ml: 'auto' }}>
                <Chip
                  icon={debugInfo.connectionStatus === 'connected' ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={`${debugInfo.connectionStatus.toUpperCase()}`}
                  color={debugInfo.connectionStatus === 'connected' ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Stack>
          </AccordionSummary>
          
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Debug Controls */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={debugPolling}
                      onChange={(e) => setDebugPolling(e.target.checked)}
                    />
                  }
                  label={`Auto-refresh (${debugInfo.connectionStatus === 'error' ? '15s' : debugInfo.connectionStatus === 'disconnected' ? '10s' : '5s'})`}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    updateDebugInfo();
                    checkAllPrinterStatus();
                  }}
                >
                  Refresh Now
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={resetDebugCounters}
                >
                  Reset Counters
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={clearDebugLogs}
                >
                  Clear Logs
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={exportLogs}
                >
                  Export Logs
                </Button>
              </Box>

              {/* Debug Stats Grid */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Stack spacing={1}>
                      <Typography variant="h4" color="primary">
                        {debugInfo.pollCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Poll Count
                      </Typography>
                      <Chip
                        icon={<TimerIcon />}
                        label={debugInfo.lastPoll ? debugInfo.lastPoll.toLocaleTimeString() : 'Never'}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Stack spacing={1}>
                      <Typography variant="h4" color="success.main">
                        {debugInfo.connectedPrinters}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Printers Connected
                      </Typography>
                      <Chip
                        icon={<ComputerIcon />}
                        label={`${debugInfo.connectedPrinters}/${printers.length}`}
                        size="small"
                        color={debugInfo.connectedPrinters > 0 ? 'success' : 'error'}
                      />
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Stack spacing={1}>
                      <Typography variant="h4" color="info.main">
                        {debugInfo.activePrints}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Prints
                      </Typography>
                      <Chip
                        icon={<PlaylistPlayIcon />}
                        label={debugInfo.activePrints > 0 ? 'Printing' : 'Idle'}
                        size="small"
                        color={debugInfo.activePrints > 0 ? 'info' : 'default'}
                      />
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Stack spacing={1}>
                      <Typography variant="h4" color="warning.main">
                        {debugInfo.pendingJobs}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Jobs
                      </Typography>
                      <Chip
                        icon={<QueueIcon />}
                        label={debugInfo.pendingJobs > 0 ? 'In Queue' : 'Empty'}
                        size="small"
                        color={debugInfo.pendingJobs > 0 ? 'warning' : 'default'}
                      />
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              {/* API Performance */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    API Performance
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        API Calls
                      </Typography>
                      <Typography variant="h6">
                        {debugInfo.apiCallCount}
                      </Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Avg Response Time
                      </Typography>
                      <Typography variant="h6">
                        {debugInfo.averageResponseTime}ms
                      </Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Error Count
                      </Typography>
                      <Typography variant="h6" color={debugInfo.errorCount > 0 ? 'error.main' : 'text.primary'}>
                        {debugInfo.errorCount}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Component Logs */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Component Logs ({componentLogs.length})
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Time</TableCell>
                          <TableCell>Level</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Message</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {componentLogs.slice(0, 20).map((log, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="caption">
                                {log.timestamp.toLocaleTimeString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={log.level}
                                size="small"
                                color={
                                  log.level === 'error' ? 'error' :
                                  log.level === 'warn' ? 'warning' :
                                  log.level === 'info' ? 'primary' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={log.category}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {log.message}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Recent Errors */}
              {errorLogs.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2">
                        Recent Errors ({errorLogs.length})
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={clearDebugLogs}
                        startIcon={<DeleteIcon />}
                      >
                        Clear All
                      </Button>
                    </Box>
                   <TableContainer sx={{ maxHeight: 300 }}>
                     <Table size="small">
                       <TableHead>
                         <TableRow>
                           <TableCell>Time</TableCell>
                           <TableCell>Type</TableCell>
                           <TableCell>Message</TableCell>
                         </TableRow>
                       </TableHead>
                       <TableBody>
                         {errorLogs.slice(0, 10).map((error, index) => (
                           <TableRow key={index}>
                             <TableCell>
                               <Typography variant="caption">
                                 {error.timestamp.toLocaleTimeString()}
                               </Typography>
                             </TableCell>
                             <TableCell>
                               <Chip 
                                 label={error.type}
                                 size="small"
                                 color={error.type === 'connection' ? 'error' : 'warning'}
                               />
                             </TableCell>
                             <TableCell>
                               <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                 {error.message}
                               </Typography>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </TableContainer>
                 </CardContent>
               </Card>
             )}

              {/* Connection Status */}
              <Alert 
                severity={debugInfo.connectionStatus === 'connected' ? 'success' : debugInfo.connectionStatus === 'error' ? 'error' : 'warning'}
                icon={<AnalyticsIcon />}
              >
                <Typography variant="body2">
                  <strong>System Status:</strong> {debugInfo.connectionStatus.toUpperCase()}<br />
                  <strong>Last Poll:</strong> {debugInfo.lastPoll ? debugInfo.lastPoll.toLocaleString() : 'Never'}<br />
                  <strong>Polling Interval:</strong> {debugInfo.connectionStatus === 'error' ? '15s (slow)' : debugInfo.connectionStatus === 'disconnected' ? '10s (medium)' : '5s (normal)'}<br />
                  <strong>Auto-refresh:</strong> {debugPolling ? 'Enabled' : 'Disabled'}<br />
                  <strong>Total Logs:</strong> {componentLogs.length}<br />
                  {debugInfo.lastError && (
                    <>
                      <strong>Last Error:</strong> {debugInfo.lastError}
                    </>
                  )}
                </Typography>
              </Alert>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 3 }} />

        {/* Printer Status */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography variant="h6">
                Available Printers ({printers.length})
              </Typography>
              {printers.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={async (e) => {
                    e.stopPropagation(); // Prevent accordion toggle
                    logger.log('info', 'user', 'User initiated bulk test print');
                    const onlinePrinters = printers.filter(p => {
                      const status = printerStatuses[p.id];
                      return !status || status.status === 'online';
                    });
                    
                    if (onlinePrinters.length === 0) {
                      showNotification('No online printers available for testing', 'warning');
                      return;
                    }
                    
                                         try {
                       // Check if we have any form configured
                       const availableForm = currentFormName || 'labels';
                       const config = getConfiguration(availableForm);
                       
                       if (!config) {
                         showNotification('Cannot test printers - No form configuration found. Please configure a printer first.', 'warning');
                         return;
                       }
                       
                       logger.log('info', 'user', 'User initiated bulk connection test for all online printers', {
                         printerCount: onlinePrinters.length,
                         printers: onlinePrinters.map(p => p.name)
                       });
                       
                       showNotification(`Queuing "Testing connection" pages for ${onlinePrinters.length} printer(s)...`, 'info');
                       
                       // Create connection test jobs for each online printer
                       const testPromises = onlinePrinters.map(async (printer) => {
                         const connectionTestData = {
                           isTestJob: true,
                           testType: 'connection-test',
                           printerName: printer.name,
                           printerId: printer.id,
                           testContent: {
                             title: 'TESTING CONNECTION',
                             message: 'Testing connection',
                             details: [
                               `Printer: ${printer.name}`,
                               `Printer ID: ${printer.id}`,
                               `Test Time: ${new Date().toLocaleString()}`,
                               'Status: Connection Test Successful'
                             ]
                           }
                         };
                         
                         try {
                           const job = await PrintApiService.submitPrintJob({
                             formName: availableForm,
                             jobData: connectionTestData,
                             options: {
                               priority: 'high',
                               copies: 1
                             }
                           });
                           
                           addJob(job);
                           logger.log('info', 'api', 'Connection test job queued', { 
                             jobId: job.id,
                             printerName: printer.name,
                             printerId: printer.id
                           });
                           
                           return { success: true, printer: printer.name, jobId: job.id };
                         } catch (error) {
                           logger.log('error', 'api', 'Failed to queue connection test', { 
                             printerName: printer.name,
                             error 
                           });
                           return { success: false, printer: printer.name, error };
                         }
                       });
                       
                       const results = await Promise.all(testPromises);
                       const successful = results.filter(r => r.success).length;
                       const failed = results.filter(r => !r.success).length;
                       
                       if (successful === onlinePrinters.length) {
                         showNotification(`✅ All ${successful} "Testing connection" pages queued successfully!`, 'success');
                       } else if (successful > 0) {
                         showNotification(`⚠️ ${successful} jobs queued, ${failed} failed. Check logs for details.`, 'warning');
                       } else {
                         showNotification(`❌ All connection test jobs failed to queue`, 'error');
                       }
                       
                       logger.log('info', 'component', 'Bulk connection test completed', {
                         successful,
                         failed,
                         totalAttempted: onlinePrinters.length
                       });
                       
                     } catch (err) {
                       logger.log('error', 'component', 'Bulk connection test failed', err);
                       showNotification('Failed to queue connection test jobs', 'error');
                     }
                  }}
                  disabled={testPrintLoading}
                >
                  Test Connection (All Online)
                </Button>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {printers.map((printer) => {
                const status = printerStatuses[printer.id];
                const isOnline = !status || status.status === 'online';
                
                return (
                  <ListItem key={printer.id}>
                    <ListItemIcon>
                      <PrintIcon color={isOnline ? 'primary' : 'disabled'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{printer.name}</Typography>
                          {!isOnline && (
                            <Chip label="Offline" size="small" color="error" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {printer.model} - {printer.connectionType}
                          </Typography>
                          {status?.lastError && (
                            <Typography variant="caption" color="error">
                              Last Error: {status.lastError}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getPrinterStatusChip(printer)}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={isOnline ? "Quick diagnostic test" : "Printer offline - cannot test"}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={() => testPrint(printer.id, printer.name, 'test-page')}
                                disabled={testPrintLoading || !isOnline}
                              >
                                Test
                              </Button>
                            </span>
                          </Tooltip>
                          
                          {isOnline && (
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value=""
                                displayEmpty
                                variant="outlined"
                                size="small"
                                onChange={(e) => {
                                  const testType = e.target.value as 'test-page' | 'alignment' | 'color';
                                  if (testType) {
                                    testPrint(printer.id, printer.name, testType);
                                  }
                                }}
                                disabled={testPrintLoading}
                                renderValue={() => "More..."}
                              >
                                <MenuItem value="test-page">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VisibilityIcon fontSize="small" />
                                    <Typography variant="body2">Diagnostic Page</Typography>
                                  </Box>
                                </MenuItem>
                                <MenuItem value="alignment">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VisibilityIcon fontSize="small" />
                                    <Typography variant="body2">Alignment Test</Typography>
                                  </Box>
                                </MenuItem>
                                <MenuItem value="color">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VisibilityIcon fontSize="small" />
                                    <Typography variant="body2">Color Test</Typography>
                                  </Box>
                                </MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        </Box>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
              {printers.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No printers found"
                    secondary="Click 'Discover Printers' to search for available printers"
                  />
                </ListItem>
              )}
            </List>
            
            {/* Test Print Instructions */}
            {printers.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  📄 Test Print Options
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="primary" fontWeight="medium">
                      🔧 Diagnostic Page
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Standard test with printer info, connectivity status, and basic patterns
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="primary" fontWeight="medium">
                      📐 Alignment Test
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Print head alignment patterns to check registration and positioning
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="primary" fontWeight="medium">
                      🎨 Color Test
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Color calibration patterns and gradients for color accuracy
                    </Typography>
                  </Grid>
                </Grid>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  • Only online printers can receive test pages • "Test Connection (All Online)" sends "Testing connection" pages to all online printers • Use individual "Test" buttons for diagnostic tests • Use "More..." dropdown for alignment and color tests
                </Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Current Configuration Summary */}
        {currentFormName && isConfigured && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Current Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {(() => {
                const config = getConfiguration(currentFormName);
                const printer = config ? printers.find(p => p.id === config.printerId) : null;
                
                return (
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="body2" color="textSecondary">
                        Printer: {printer?.name || 'Unknown'}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="textSecondary">
                        Paper: {config?.paperSize} ({config?.orientation})
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="textSecondary">
                        Quality: {config?.quality}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="textSecondary">
                        Copies: {config?.copies}
                      </Typography>
                    </Grid>
                  </Grid>
                );
              })()}
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentFormName ? `Configure Printer for ${currentFormName}` : 'Configure Printer for Form/Table'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Assign a printer to a form/table:</strong> This configuration determines which printer will be used when printing from different parts of the app (labels, stickers, reports, etc.).
            </Typography>
          </Alert>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Form/Table to Configure</InputLabel>
                <Select
                  value={currentFormName || ''}
                  onChange={(e) => {
                    setSelectedForm(e.target.value);
                    // Load existing config for this form
                    const existingConfig = getConfiguration(e.target.value);
                    if (existingConfig) {
                      setCurrentConfig(existingConfig);
                    } else {
                      setCurrentConfig({
                        formName: e.target.value,
                        paperSize: 'A4',
                        orientation: 'portrait',
                        copies: 1,
                        quality: 'normal',
                        colorMode: 'color',
                        margins: { top: 10, right: 10, bottom: 10, left: 10 }
                      });
                    }
                  }}
                  label="Form/Table to Configure"
                >
                  <MenuItem value="labels">🏷️ Labels</MenuItem>
                  <MenuItem value="stickers">🔖 Stickers</MenuItem>
                  <MenuItem value="receipts">🧾 Receipts</MenuItem>
                  <MenuItem value="reports">📄 Reports</MenuItem>
                  <MenuItem value="invoices">💸 Invoices</MenuItem>
                  <MenuItem value="inspection-forms">🔍 Inspection Forms</MenuItem>
                  <MenuItem value="test-print">🧪 Test Print</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Printer</InputLabel>
                <Select
                  value={currentConfig.printerId || ''}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, printerId: e.target.value })}
                  label="Printer"
                >
                  {printers.map((printer) => (
                    <MenuItem key={printer.id} value={printer.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography sx={{ flex: 1 }}>{printer.name}</Typography>
                        {getPrinterStatusChip(printer)}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Test Print Section */}
              {currentConfig.printerId && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PrintIcon fontSize="small" />
                    Printer Testing
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Send different types of test pages to verify printer functionality
                  </Typography>
                  
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          const printer = printers.find(p => p.id === currentConfig.printerId);
                          if (printer) {
                            testPrint(printer.id, printer.name, 'test-page');
                          }
                        }}
                        disabled={testPrintLoading}
                      >
                        {testPrintLoading ? 'Sending...' : 'Diagnostic'}
                      </Button>
                      <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 0.5 }}>
                        Standard test page
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          const printer = printers.find(p => p.id === currentConfig.printerId);
                          if (printer) {
                            testPrint(printer.id, printer.name, 'alignment');
                          }
                        }}
                        disabled={testPrintLoading}
                      >
                        Alignment
                      </Button>
                      <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 0.5 }}>
                        Print head alignment
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          const printer = printers.find(p => p.id === currentConfig.printerId);
                          if (printer) {
                            testPrint(printer.id, printer.name, 'color');
                          }
                        }}
                        disabled={testPrintLoading}
                      >
                        Color Test
                      </Button>
                      <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 0.5 }}>
                        Color calibration
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {(() => {
                    const printer = printers.find(p => p.id === currentConfig.printerId);
                    const status = printer ? printerStatuses[printer.id] : null;
                    if (status && status.status !== 'online') {
                      return (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          Printer is {status.status}. Test prints may not work.
                        </Alert>
                      );
                    }
                    return null;
                  })()}
                </Box>
              )}
            </Grid>

            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Paper Size</InputLabel>
                <Select
                  value={currentConfig.paperSize || 'A4'}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, paperSize: e.target.value })}
                  label="Paper Size"
                >
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="Letter">Letter</MenuItem>
                  <MenuItem value="Legal">Legal</MenuItem>
                  <MenuItem value="4x6">4x6 Label</MenuItem>
                  <MenuItem value="2x1">2x1 Label</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Orientation</InputLabel>
                <Select
                  value={currentConfig.orientation || 'portrait'}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, orientation: e.target.value as 'portrait' | 'landscape' })}
                  label="Orientation"
                >
                  <MenuItem value="portrait">Portrait</MenuItem>
                  <MenuItem value="landscape">Landscape</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={4}>
              <TextField
                fullWidth
                label="Copies"
                type="number"
                value={currentConfig.copies || 1}
                onChange={(e) => setCurrentConfig({ ...currentConfig, copies: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>

            <Grid size={4}>
              <FormControl fullWidth>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={currentConfig.quality || 'normal'}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, quality: e.target.value as any })}
                  label="Quality"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={4}>
              <FormControl fullWidth>
                <InputLabel>Color Mode</InputLabel>
                <Select
                  value={currentConfig.colorMode || 'color'}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, colorMode: e.target.value as any })}
                  label="Color Mode"
                >
                  <MenuItem value="color">Color</MenuItem>
                  <MenuItem value="grayscale">Grayscale</MenuItem>
                  <MenuItem value="monochrome">Black & White</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveConfiguration} variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Printer Discovery Dialog */}
      <Dialog open={printerDiscoveryOpen} onClose={() => setDiscoveryOpen(false)}>
        <DialogTitle>Discover Printers</DialogTitle>
        <DialogContent>
          <Typography>
            This will search for available printers on your network and add them to the list.
          </Typography>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscoveryOpen(false)}>Cancel</Button>
          <Button onClick={discoverPrinters} variant="contained" disabled={loading}>
            Start Discovery
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Queue Dialog */}
      <Dialog 
        open={queueDialogOpen} 
        onClose={() => setQueueDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QueueIcon />
              <Typography variant="h6">Print Queue ({queueData.length})</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                onClick={loadQueueData} 
                size="small"
                title="Refresh Queue"
              >
                <RefreshIcon />
              </IconButton>
              {queueData.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={clearAllQueue}
                  disabled={clearingQueue}
                >
                  Clear All
                </Button>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {queueData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QueueIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No items in queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Print jobs will appear here when they are queued
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Form Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queueData.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {job.id.slice(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={job.formName || 'Unknown'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={job.status || 'pending'}
                          size="small"
                          color={
                            job.status === 'pending' ? 'warning' :
                            job.status === 'printing' ? 'info' :
                            job.status === 'completed' ? 'success' :
                            job.status === 'failed' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {job.priority || 'Normal'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Cancel Job">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => clearQueueItem(job.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {clearingQueue && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Clearing queue...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQueueDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PrintManager; 