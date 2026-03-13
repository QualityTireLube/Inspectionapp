import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Badge,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Stack,
  Tooltip,
  Slider,
  ListSubheader,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Print as PrintIcon,
  Queue as QueueIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  ContentCopy as CopyIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import { usePrintStore } from '../stores/printStore';
import PrintApiService from '../services/printApi';
import { LocationPrintDefaultsService } from '../services/locationPrintDefaults';
import { useNotification } from '../hooks/useNotification';
import { PrinterConfig, PrintConfiguration, PrinterStatus } from '../types/print';
import { getUserSettings, updateUserSettings } from '../services/api';

// Interface for grouping printers by client
interface PrintersByClient {
  clientId: string;
  clientName: string;
  online: boolean;
  printers: PrinterConfig[];
}

interface LabelPrintSettingsProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (printMethod: 'pdf' | 'queue' | 'queue-fallback', printerId?: string, orientation?: string, autoPrint?: boolean) => void;
  settingsSource?: 'user' | 'location' | 'system';
}

// Copies Selection Dialog Component
const CopiesSelectionDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (copies: number) => void;
  currentCopies: number;
}> = ({ open, onClose, onConfirm, currentCopies }) => {
  const [copies, setCopies] = useState(currentCopies);

  const handleConfirm = () => {
    onConfirm(copies);
    onClose();
  };

  const handleClose = () => {
    setCopies(currentCopies); // Reset to original value
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CopyIcon />
          <Typography variant="h6">Set Default Copies</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" gutterBottom>
            How many copies should be printed by default?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
            This setting will apply to all label prints unless changed during individual label creation.
          </Typography>
          
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="h4" align="center" color="primary" gutterBottom>
              {copies}
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
              {copies === 1 ? 'copy' : 'copies'}
            </Typography>
            
            <Slider
              value={copies}
              onChange={(_, value) => setCopies(value as number)}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' }
              ]}
              valueLabelDisplay="auto"
              sx={{ mt: 3 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((num) => (
              <Chip
                key={num}
                label={`${num} ${num === 1 ? 'copy' : 'copies'}`}
                onClick={() => setCopies(num)}
                color={copies === num ? 'primary' : 'default'}
                variant={copies === num ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained">
          Set Default Copies
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const LabelPrintSettings: React.FC<LabelPrintSettingsProps> = ({
  open,
  onClose,
  onSettingsChange,
  settingsSource = 'system'
}) => {
  const {
    printers,
    configurations,
    loading,
    error,
    setPrinters,
    setConfigurations,
    setConfiguration,
    getConfiguration,
    setLoading,
    setError,
    clearError,
  } = usePrintStore();

  const { showNotification } = useNotification();

  // Local state
  const [printMethod, setPrintMethod] = useState<'pdf' | 'queue' | 'queue-fallback'>('pdf');
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerStatuses, setPrinterStatuses] = useState<Record<string, PrinterStatus>>({});
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [queueData, setQueueData] = useState<any[]>([]);
  const [printersByClient, setPrintersByClient] = useState<PrintersByClient[]>([]);
  const [activeClients, setActiveClients] = useState<Map<string, boolean>>(new Map());
  
  // Copies settings
  const [enableCustomCopies, setEnableCustomCopies] = useState(false);
  const [defaultCopies, setDefaultCopies] = useState(1);
  const [showCopiesDialog, setShowCopiesDialog] = useState(false);
  
  // Auto-cut setting for Brother QL-800 label printers
  const [autoCut, setAutoCut] = useState(true);
  
  // Save as location default option
  const [saveAsLocationDefault, setSaveAsLocationDefault] = useState(false);

  // Form name for labels
  const LABELS_FORM_NAME = 'labels';

  // Load settings from existing configuration
  useEffect(() => {
    if (open) {
      loadPrinters();
      loadQueueData();
      loadLabelSettings();
    }
  }, [open, getConfiguration]);

  // Load label print settings from server (with localStorage fallback)
  const loadLabelSettings = async () => {
    try {
      // Try to load from server settings first
      const userSettings = await getUserSettings();
      const labelSettings = userSettings.labelPrintSettings;
      
      if (labelSettings) {
        setPrintMethod(labelSettings.printMethod || 'pdf');
        setSelectedPrinterId(labelSettings.printerId || '');
        setOrientation(labelSettings.orientation || 'portrait');
        setAutoPrint(labelSettings.autoPrint || false);
        setEnableCustomCopies(labelSettings.enableCustomCopies || false);
        setDefaultCopies(labelSettings.defaultCopies || 1);
        setAutoCut(labelSettings.autoCut !== false); // Default to true if not set
      } else {
        // Fallback to localStorage and migrate to server
        const savedPrintMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
        const savedPrinterId = localStorage.getItem('labelPrinterId') || '';
        const savedOrientation = (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
        const savedAutoPrint = localStorage.getItem('labelPrintAutoPrint') === 'true';
        const savedEnableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
        const savedDefaultCopies = parseInt(localStorage.getItem('labelPrintDefaultCopies') || '1');
        const savedAutoCut = localStorage.getItem('labelPrintAutoCut') !== 'false'; // Default to true
        
        setPrintMethod(savedPrintMethod);
        setSelectedPrinterId(savedPrinterId);
        setOrientation(savedOrientation);
        setAutoPrint(savedAutoPrint);
        setEnableCustomCopies(savedEnableCustomCopies);
        setDefaultCopies(savedDefaultCopies);
        setAutoCut(savedAutoCut);
        
        // Migrate to server if we have localStorage data
        if (savedPrintMethod !== 'pdf' || savedPrinterId || savedOrientation !== 'portrait' || savedAutoPrint || savedEnableCustomCopies || savedDefaultCopies !== 1) {
          const settingsToMigrate = {
            printMethod: savedPrintMethod,
            printerId: savedPrinterId,
            orientation: savedOrientation,
            autoPrint: savedAutoPrint,
            enableCustomCopies: savedEnableCustomCopies,
            defaultCopies: savedDefaultCopies,
            autoCut: savedAutoCut
          };
          
          try {
            await updateUserSettings({
              ...userSettings,
              labelPrintSettings: settingsToMigrate
            });
            // Keep localStorage as backup but server is now primary
          } catch (err) {
            console.error('Failed to migrate label settings to server:', err);
          }
        }
      }
      
      // Load existing print queue configuration
      const config = getConfiguration(LABELS_FORM_NAME);
      if (config && !labelSettings?.printerId) {
        setSelectedPrinterId(config.printerId);
      }
    } catch (err) {
      console.error('Failed to load label settings from server, using localStorage fallback:', err);
      // Fallback to localStorage if server fails
      const savedPrintMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
      const savedPrinterId = localStorage.getItem('labelPrinterId') || '';
      const savedOrientation = (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
      const savedAutoPrint = localStorage.getItem('labelPrintAutoPrint') === 'true';
      const savedEnableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
      const savedDefaultCopies = parseInt(localStorage.getItem('labelPrintDefaultCopies') || '1');
      const savedAutoCut = localStorage.getItem('labelPrintAutoCut') !== 'false'; // Default to true
      
      setPrintMethod(savedPrintMethod);
      setSelectedPrinterId(savedPrinterId);
      setOrientation(savedOrientation);
      setAutoPrint(savedAutoPrint);
      setEnableCustomCopies(savedEnableCustomCopies);
      setDefaultCopies(savedDefaultCopies);
      setAutoCut(savedAutoCut);
    }
  };

  // Load printers and their statuses, grouped by print client
  const loadPrinters = async () => {
    try {
      setLoading(true);
      // Get printers (which now include real-time status based on client polling state)
      // Get registered clients (which now include real-time status from polling state)
      // Get active polling clients for additional online status info
      const [printersData, configsData, registeredClients, activeClientsData] = await Promise.all([
        PrintApiService.getPrinters(),
        PrintApiService.getConfigurations(),
        PrintApiService.getPrintClients(),
        PrintApiService.getActivePollingClients()
      ]);
      
      setPrinters(printersData);
      setConfigurations(configsData);
      
      // Build active clients map for online status (combine registered + active polling)
      const clientOnlineMap = new Map<string, boolean>();
      
      // First, add registered clients with their status (which now reflects real-time polling state)
      registeredClients.forEach(client => {
        clientOnlineMap.set(client.clientId, client.status === 'online');
      });
      
      // Also add any active polling clients that might not be registered yet
      activeClientsData.clients.forEach(client => {
        if (client.online) {
          clientOnlineMap.set(client.clientId, true);
        }
      });
      setActiveClients(clientOnlineMap);
      
      // Group printers by print client
      const clientMap = new Map<string, PrintersByClient>();
      
      // First, add all registered clients (even if they have no printers yet)
      registeredClients.forEach(client => {
        clientMap.set(client.clientId, {
          clientId: client.clientId,
          clientName: client.name || `Client ${client.clientId.slice(0, 8)}...`,
          online: client.status === 'online',
          printers: []
        });
      });
      
      // Also add any active polling clients not in registered list
      activeClientsData.clients.forEach(client => {
        if (!clientMap.has(client.clientId)) {
          clientMap.set(client.clientId, {
            clientId: client.clientId,
            clientName: client.name || `Client ${client.clientId.slice(0, 8)}...`,
            online: client.online,
            printers: []
          });
        }
      });
      
      // Then add printers to their respective clients
      printersData.forEach(printer => {
        const clientId = printer.printClientId || printer.clientId || 'unknown';
        
        if (!clientMap.has(clientId)) {
          // Create entry for unknown/unregistered client
          clientMap.set(clientId, {
            clientId,
            clientName: clientId === 'unknown' ? 'Unassigned Printers' : `Client ${clientId.slice(0, 8)}...`,
            online: clientOnlineMap.get(clientId) || false,
            printers: []
          });
        }
        
        clientMap.get(clientId)!.printers.push(printer);
      });
      
      // Convert to array and sort: online clients first, then by name
      const groupedPrinters = Array.from(clientMap.values())
        .filter(client => client.printers.length > 0) // Only show clients with printers
        .sort((a, b) => {
          if (a.online !== b.online) return a.online ? -1 : 1;
          return a.clientName.localeCompare(b.clientName);
        });
      
      setPrintersByClient(groupedPrinters);
      
      // Note: We no longer need to call checkAllPrinterStatus separately since
      // the /printers endpoint now returns real-time status based on client polling state
      // But we still load it for the detailed status chips
      const statuses = await PrintApiService.checkAllPrinterStatus();
      const statusMap = statuses.reduce((acc, status) => {
        acc[status.printerId] = status;
        return acc;
      }, {} as Record<string, PrinterStatus>);
      setPrinterStatuses(statusMap);
      
    } catch (err) {
      console.error('Failed to load printers:', err);
      setError('Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  // Load print queue data
  const loadQueueData = async () => {
    try {
      const queue = await PrintApiService.getPrintQueue();
      setQueueData(queue.jobs || []);
    } catch (err) {
      console.error('Failed to load queue data:', err);
      setQueueData([]);
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

  // Test print function
  const testPrint = async (printerId: string) => {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;

    try {
      setTestPrintLoading(true);
      
      // Create test label data
      const testLabelData = {
        isTestJob: true,
        testType: 'label-test',
        printerName: printer.name,
        printerId: printerId,
        testContent: {
          title: 'LABEL TEST PRINT',
          subtitle: 'Label Print Test',
          details: [
            `Printer: ${printer.name}`,
            `Test Time: ${new Date().toLocaleString()}`,
            'This is a test label print',
            'Template: Test Template',
            'Created by: Test User'
          ]
        }
      };

      const job = await PrintApiService.submitPrintJob({
        formName: LABELS_FORM_NAME,
        jobData: testLabelData,
        options: {
          priority: 'high',
          copies: 1
        }
      });

      showNotification(`Test label queued for ${printer.name} (Job: ${job.id.slice(0, 8)}...)`, 'success');
      loadQueueData(); // Refresh queue
      
    } catch (err) {
      console.error('Failed to test print:', err);
      showNotification(`Failed to queue test label for ${printer.name}`, 'error');
    } finally {
      setTestPrintLoading(false);
    }
  };

  // Handle copies dialog confirmation
  const handleCopiesConfirm = (copies: number) => {
    setDefaultCopies(copies);
  };

  // Save configuration
  const saveConfiguration = async () => {
    try {
      if ((printMethod === 'queue' || printMethod === 'queue-fallback') && !selectedPrinterId) {
        showNotification('Please select a printer when using print queue', 'error');
        return;
      }

      if (printMethod === 'queue' || printMethod === 'queue-fallback') {
        // Get the print client ID for the selected printer
        const targetClientId = selectedPrinter?.printClientId || 
          printersByClient.find(c => c.printers.some(p => p.id === selectedPrinterId))?.clientId || 
          null;
        
        // Save to print configuration system with client ID for job routing
        const config: PrintConfiguration = {
          formName: LABELS_FORM_NAME,
          printerId: selectedPrinterId,
          paperSize: 'Brother-QL800', // Typical label size
          orientation: orientation,
          margins: { top: 5, right: 5, bottom: 5, left: 5 },
          copies: enableCustomCopies ? defaultCopies : 1,
          quality: 'high',
          colorMode: 'color',
          customSettings: {
            labelMode: true,
            autoQueue: true
          },
          targetClientId: targetClientId || undefined, // Include client ID for job routing
          locationId: localStorage.getItem('selectedLocationId') || undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await PrintApiService.saveConfiguration(LABELS_FORM_NAME, config);
        setConfiguration(LABELS_FORM_NAME, config);
      } else {
        // Remove configuration if not using queue
        try {
          await PrintApiService.deleteConfiguration(LABELS_FORM_NAME);
        } catch (err) {
          // Configuration might not exist, that's okay
        }
      }

      // Check if we should save as location default
      const currentLocationId = localStorage.getItem('selectedLocationId');
      
      if (saveAsLocationDefault && currentLocationId && (printMethod === 'queue' || printMethod === 'queue-fallback') && selectedPrinterId) {
        // Get the print client ID for the selected printer
        const targetClientId = selectedPrinter?.printClientId || 
          printersByClient.find(c => c.printers.some(p => p.id === selectedPrinterId))?.clientId || 
          null;
        
        // Save as location default (force update to overwrite any existing)
        try {
          await LocationPrintDefaultsService.forceUpdateLocationDefault(currentLocationId, 'labels', {
            printMethod,
            printerId: selectedPrinterId,
            printClientId: targetClientId || undefined,
            orientation,
            autoPrint,
            autoCut,
            updatedBy: localStorage.getItem('userName') || 'Unknown'
          });
          showNotification('Label printer saved as location default for all users!', 'success');
          
          // Don't mark as user override since we're setting location default
          // Just save to localStorage as backup
          localStorage.setItem('labelPrintMethod', printMethod);
          localStorage.setItem('labelPrinterId', selectedPrinterId);
          localStorage.setItem('labelPrintOrientation', orientation);
          localStorage.setItem('labelPrintAutoPrint', autoPrint.toString());
          localStorage.setItem('labelPrintEnableCustomCopies', enableCustomCopies.toString());
          localStorage.setItem('labelPrintDefaultCopies', defaultCopies.toString());
          localStorage.setItem('labelPrintAutoCut', autoCut.toString());
        } catch (err) {
          console.error('Failed to save as location default:', err);
          showNotification('Failed to save as location default', 'error');
        }
      } else {
        // Save to server settings (primary) and localStorage (backup)
        // Mark as user override so it takes precedence over location defaults
        const labelSettings = {
          printMethod,
          printerId: selectedPrinterId,
          orientation,
          autoPrint,
          enableCustomCopies,
          defaultCopies,
          autoCut,
          isUserOverride: true // This marks the settings as explicitly set by the user
        };
        
        try {
          // Get current user settings and update with label settings
          const currentSettings = await getUserSettings();
          await updateUserSettings({
            ...currentSettings,
            labelPrintSettings: labelSettings
          });
          
          // Also save to localStorage as backup
          localStorage.setItem('labelPrintMethod', printMethod);
          localStorage.setItem('labelPrinterId', selectedPrinterId);
          localStorage.setItem('labelPrintOrientation', orientation);
          localStorage.setItem('labelPrintAutoPrint', autoPrint.toString());
          localStorage.setItem('labelPrintEnableCustomCopies', enableCustomCopies.toString());
          localStorage.setItem('labelPrintDefaultCopies', defaultCopies.toString());
          localStorage.setItem('labelPrintAutoCut', autoCut.toString());
          
          showNotification('Label print settings saved for your account', 'success');
        } catch (err) {
          console.error('Failed to save label settings to server, saving to localStorage only:', err);
          
          // Fallback to localStorage only
          localStorage.setItem('labelPrintMethod', printMethod);
          localStorage.setItem('labelPrinterId', selectedPrinterId);
          localStorage.setItem('labelPrintOrientation', orientation);
          localStorage.setItem('labelPrintAutoPrint', autoPrint.toString());
          localStorage.setItem('labelPrintEnableCustomCopies', enableCustomCopies.toString());
          localStorage.setItem('labelPrintDefaultCopies', defaultCopies.toString());
          localStorage.setItem('labelPrintAutoCut', autoCut.toString());
          
          showNotification('Label print settings saved locally (server unavailable)', 'warning');
        }
      }

      // Notify parent component
      onSettingsChange?.(printMethod, selectedPrinterId, orientation, autoPrint);
      onClose();
      
    } catch (err) {
      console.error('Failed to save configuration:', err);
      showNotification('Failed to save label print settings', 'error');
    }
  };

  // Reset to location default (removes user override)
  const handleResetToLocationDefault = async () => {
    try {
      const currentLocationId = localStorage.getItem('selectedLocationId');
      if (!currentLocationId) {
        showNotification('No location selected. Cannot reset to location default.', 'warning');
        return;
      }

      // Get location defaults
      const locationDefaults = await LocationPrintDefaultsService.getLocationDefaults(currentLocationId);
      
      if (!locationDefaults.labels) {
        showNotification('No location default configured for labels. Settings will use system defaults.', 'info');
      }

      // Remove user override by saving settings without isUserOverride flag
      const currentSettings = await getUserSettings();
      const { isUserOverride, ...labelSettingsWithoutOverride } = currentSettings.labelPrintSettings || {};
      
      await updateUserSettings({
        ...currentSettings,
        labelPrintSettings: labelSettingsWithoutOverride
      });

      // Clear localStorage
      localStorage.removeItem('labelPrintMethod');
      localStorage.removeItem('labelPrinterId');
      localStorage.removeItem('labelPrintOrientation');
      localStorage.removeItem('labelPrintAutoPrint');
      localStorage.removeItem('labelPrintEnableCustomCopies');
      localStorage.removeItem('labelPrintDefaultCopies');
      localStorage.removeItem('labelPrintAutoCut');

      showNotification('Reset to location default. Settings will reload.', 'success');
      
      // Notify parent to reload settings
      onSettingsChange?.('pdf', '', 'portrait', false);
      onClose();
      
    } catch (err) {
      console.error('Failed to reset to location default:', err);
      showNotification('Failed to reset settings', 'error');
    }
  };

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId);
  const isConfigured = (printMethod === 'queue' || printMethod === 'queue-fallback') && selectedPrinterId;

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography variant="h6">Label Print Settings</Typography>
            <Badge badgeContent={queueData.length} color="primary">
              <QueueIcon />
            </Badge>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          {/* Settings Source Indicator */}
          {settingsSource === 'user' && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleResetToLocationDefault}>
                  Reset to Location Default
                </Button>
              }
            >
              Using your custom settings (overrides location default)
            </Alert>
          )}
          {settingsSource === 'location' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Using location default settings. Changes will create a personal override.
            </Alert>
          )}
          {settingsSource === 'system' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No location default configured. Using system defaults.
            </Alert>
          )}

          <Stack spacing={3}>
            {/* Print Method Selection */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Print Method
              </Typography>
              <FormControl fullWidth>
                <InputLabel>How to handle label printing</InputLabel>
                <Select
                  value={printMethod}
                  onChange={(e) => setPrintMethod(e.target.value as 'pdf' | 'queue' | 'queue-fallback')}
                  label="How to handle label printing"
                >
                  <MenuItem value="pdf">
                    <Box>
                      <Typography variant="body1">Save as PDF</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Open labels as PDFs in new tabs for manual printing
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="queue">
                    <Box>
                      <Typography variant="body1">Send to Print Queue</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Automatically send labels to selected printer via print queue
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="queue-fallback">
                    <Box>
                      <Typography variant="body1">Send to Print Queue After Fail Open PDF</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Try print queue first, then automatically open PDF if printing fails
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Paper>

            {/* Orientation Settings */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Print Orientation
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Orientation</InputLabel>
                <Select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                  label="Orientation"
                >
                  <MenuItem value="portrait">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 28, 
                          border: '2px solid', 
                          borderColor: 'primary.main',
                          borderRadius: 1
                        }} 
                      />
                      <Typography>Portrait (Tall)</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="landscape">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box 
                        sx={{ 
                          width: 28, 
                          height: 20, 
                          border: '2px solid', 
                          borderColor: 'primary.main',
                          borderRadius: 1
                        }} 
                      />
                      <Typography>Landscape (Wide)</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {orientation === 'portrait' 
                  ? 'Portrait orientation is best for standard labels'
                  : 'Landscape orientation provides more horizontal space for content'
                }
              </Typography>
            </Paper>

            {/* Auto-Cut Settings for Brother QL-800 */}
            {(printMethod === 'queue' || printMethod === 'queue-fallback') && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Label Cutting
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoCut}
                      onChange={(e) => setAutoCut(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        Auto-Cut Labels
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {autoCut
                          ? 'Labels will be automatically cut after printing (Brother QL-800)'
                          : 'Labels will NOT be cut - useful for printing multiple labels in a row'
                        }
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            )}

            {/* Copies Settings */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Default Copies
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableCustomCopies}
                    onChange={(e) => setEnableCustomCopies(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Set Default Number of Copies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {enableCustomCopies
                        ? `Labels will print ${defaultCopies} ${defaultCopies === 1 ? 'copy' : 'copies'} by default. Click to change.`
                        : 'Labels will print 1 copy by default. Enable to set a custom default.'
                      }
                    </Typography>
                  </Box>
                }
              />
              
              {enableCustomCopies && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle2">
                        Default Copies: {defaultCopies}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {defaultCopies === 1 ? 'copy' : 'copies'} per label
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<CopyIcon />}
                      onClick={() => setShowCopiesDialog(true)}
                      size="small"
                    >
                      Change Copies
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>

            {/* Auto-Print Settings */}
            {(printMethod === 'queue' || printMethod === 'queue-fallback') && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Auto-Print Options
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoPrint}
                      onChange={(e) => setAutoPrint(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        Auto-Print When Saving
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {autoPrint
                          ? 'Labels will automatically print when saved. If auto-print fails after 3 attempts, PDF will open for manual printing.'
                          : 'Manual print required - click the print icon after saving'
                        }
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            )}

            {/* Printer Selection */}
            {(printMethod === 'queue' || printMethod === 'queue-fallback') && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Printer Configuration
                  </Typography>
                  <IconButton onClick={loadPrinters} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Printer</InputLabel>
                  <Select
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    label="Select Printer"
                  >
                    {printersByClient.length > 0 ? (
                      // Grouped by Print Client
                      printersByClient.map((clientGroup) => [
                        <ListSubheader 
                          key={`header-${clientGroup.clientId}`}
                          sx={{ 
                            bgcolor: clientGroup.online ? 'success.50' : 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            py: 1
                          }}
                        >
                          <ComputerIcon 
                            fontSize="small" 
                            color={clientGroup.online ? 'success' : 'disabled'} 
                          />
                          <Typography variant="subtitle2" sx={{ flex: 1 }}>
                            {clientGroup.clientName}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={clientGroup.online ? 'Online' : 'Offline'}
                            color={clientGroup.online ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </ListSubheader>,
                        ...clientGroup.printers.map((printer) => (
                          <MenuItem 
                            key={printer.id} 
                            value={printer.id}
                            sx={{ pl: 4 }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <PrintIcon fontSize="small" color="action" />
                              <Typography sx={{ flex: 1 }}>{printer.name}</Typography>
                              {getPrinterStatusChip(printer)}
                            </Box>
                          </MenuItem>
                        ))
                      ]).flat()
                    ) : (
                      // Fallback: flat list if no grouping available
                      printers.map((printer) => (
                        <MenuItem key={printer.id} value={printer.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Typography sx={{ flex: 1 }}>{printer.name}</Typography>
                            {getPrinterStatusChip(printer)}
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                
                {/* Show which client the selected printer belongs to */}
                {selectedPrinterId && (
                  <Box sx={{ mb: 2 }}>
                    {(() => {
                      const clientGroup = printersByClient.find(c => 
                        c.printers.some(p => p.id === selectedPrinterId)
                      );
                      if (clientGroup) {
                        return (
                          <Alert 
                            severity={clientGroup.online ? 'success' : 'warning'} 
                            icon={<ComputerIcon />}
                            sx={{ py: 0.5 }}
                          >
                            <Typography variant="body2">
                              <strong>Print Client:</strong> {clientGroup.clientName}
                              {!clientGroup.online && ' (Currently Offline)'}
                            </Typography>
                          </Alert>
                        );
                      }
                      return null;
                    })()}
                  </Box>
                )}

                {/* Test Print Section */}
                {selectedPrinterId && selectedPrinter && (
                  <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2">
                        Test Print: {selectedPrinter.name}
                      </Typography>
                      {getPrinterStatusChip(selectedPrinter)}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Send a test label to verify the printer is working correctly
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => testPrint(selectedPrinterId)}
                      disabled={testPrintLoading || printerStatuses[selectedPrinterId]?.status !== 'online'}
                      size="small"
                    >
                      {testPrintLoading ? 'Sending...' : 'Send Test Label'}
                    </Button>
                  </Box>
                )}

                {printers.length === 0 && (
                  <Alert severity="info">
                    No printers found. Make sure a print client is running and has registered its printers.
                    {activeClients.size > 0 && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>{activeClients.size} print client(s) online</strong> - printers should appear once they register.
                        Try clicking the refresh button above.
                      </Typography>
                    )}
                  </Alert>
                )}
              </Paper>
            )}

            {/* Current Queue Status */}
            {(printMethod === 'queue' || printMethod === 'queue-fallback') && queueData.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Current Print Queue ({queueData.length} jobs)
                </Typography>
                <List dense>
                  {queueData.slice(0, 5).map((job, index) => (
                    <ListItem key={job.id}>
                      <ListItemIcon>
                        <PrintIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Job ${job.id.slice(0, 8)}...`}
                        secondary={`${job.formName} - ${job.status}`}
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={job.status}
                          size="small"
                          color={
                            job.status === 'pending' ? 'warning' :
                            job.status === 'printing' ? 'info' :
                            job.status === 'completed' ? 'success' : 'default'
                          }
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {queueData.length > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${queueData.length - 5} more jobs`}
                        sx={{ textAlign: 'center', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}

            {/* Configuration Summary */}
            {isConfigured && (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Configuration Ready:</strong> Labels will be sent to {selectedPrinter?.name} via the print queue system.
                  {enableCustomCopies && (
                    <span> Default copies: {defaultCopies}.</span>
                  )}
                </Typography>
              </Alert>
            )}

            {/* Option to save as location default when no default exists */}
            {settingsSource === 'system' && isConfigured && (
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={saveAsLocationDefault}
                      onChange={(e) => setSaveAsLocationDefault(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Set as location default
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        This will make {selectedPrinter?.name} the default label printer for all users at this location
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={saveConfiguration} 
            variant="contained"
            disabled={loading || ((printMethod === 'queue' || printMethod === 'queue-fallback') && !selectedPrinterId)}
          >
            {saveAsLocationDefault ? 'Save as Location Default' : 'Save Settings'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copies Selection Dialog */}
      <CopiesSelectionDialog
        open={showCopiesDialog}
        onClose={() => setShowCopiesDialog(false)}
        onConfirm={handleCopiesConfirm}
        currentCopies={defaultCopies}
      />
    </>
  );
};

export default LabelPrintSettings; 