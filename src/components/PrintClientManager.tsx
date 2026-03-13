import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
  Paper,
  Grid,
  CardHeader,
  CardActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon,
  Computer as ComputerIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  Error as ErrorIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  PersonAdd as RegisterIcon,
  Place as LocationIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { PrintClient, PrintClientFormData, PrintClientWithPrinters, PrinterConfig } from '../types/print';
import { Location } from '../types/locations';
import { LocationService } from '../services/locationService';
import PrintApiService from '../services/printApi';
import { usePrintStore } from '../stores/printStore';
import { useWebSocket } from '../contexts/WebSocketProvider';

// Type for active polling clients from the API
interface ActivePollingClient {
  clientId: string;
  online: boolean;
  lastSeen: string | null;
  id: string | null;
  name: string;
  locationId: string | null;
  description: string | null;
}

interface PrintClientManagerProps {
  locationId?: string; // Optional: filter to specific location
  onClientSelect?: (client: PrintClient) => void;
  showLocationFilter?: boolean;
}

const PrintClientManager: React.FC<PrintClientManagerProps> = ({
  locationId: propLocationId,
  onClientSelect,
  showLocationFilter = true
}) => {
  // State
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(propLocationId || '');
  const [clients, setClients] = useState<PrintClientWithPrinters[]>([]); // Current location clients
  const [allClients, setAllClients] = useState<PrintClient[]>([]); // ALL registered clients
  const [activeClients, setActiveClients] = useState<ActivePollingClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [clientPrinters, setClientPrinters] = useState<Record<string, PrinterConfig[]>>({}); // Printers by clientId
  const [loadingPrinters, setLoadingPrinters] = useState<Set<string>>(new Set());
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<PrintClient | null>(null);
  const [formData, setFormData] = useState<PrintClientFormData>({
    name: '',
    locationId: '',
    clientId: '',
    description: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<PrintClient | null>(null);
  
  // Store
  const { setPrintClients, setCurrentLocationClients } = usePrintStore();
  
  // WebSocket for real-time updates
  const { subscribe, isConnected } = useWebSocket();

  // Load locations on mount
  useEffect(() => {
    const loadedLocations = LocationService.getLocations();
    setLocations(loadedLocations);
    
    // Set default location if not provided
    if (!propLocationId && loadedLocations.length > 0) {
      setSelectedLocationId(loadedLocations[0].id);
    }
  }, [propLocationId]);

  // Load ALL registered clients (for the grouped view)
  const loadAllClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedClients = await PrintApiService.getPrintClients(); // Get ALL clients
      setAllClients(loadedClients);
      
      // Also update the current location clients for the store
      if (selectedLocationId) {
        const locationClients = loadedClients.filter(c => c.locationId === selectedLocationId);
        setClients(locationClients as PrintClientWithPrinters[]);
        setCurrentLocationClients(locationClients as PrintClientWithPrinters[]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load print clients');
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, setCurrentLocationClients]);

  // Legacy function for compatibility - now just calls loadAllClients
  const loadClients = loadAllClients;

  // Load active polling clients (found clients)
  const loadActiveClients = useCallback(async () => {
    setLoadingActive(true);
    try {
      const response = await PrintApiService.getActivePollingClients();
      setActiveClients(response.clients);
    } catch (err: any) {
      console.error('Failed to load active clients:', err);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
    loadActiveClients();
  }, [loadClients, loadActiveClients]);

  // Auto-expand all locations when clients are loaded
  useEffect(() => {
    if (allClients.length > 0) {
      const locationIds = new Set(allClients.map(c => c.locationId || 'unassigned'));
      setExpandedLocations(locationIds);
    }
  }, [allClients]);

  // Subscribe to WebSocket updates for real-time client status
  useEffect(() => {
    const unsubscribe = subscribe('print_client_summary', () => {
      // Refresh active clients when we get a status update
      loadActiveClients();
    });
    
    return () => unsubscribe();
  }, [subscribe, loadActiveClients]);

  // Auto-refresh active clients every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveClients();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadActiveClients]);

  // Get unregistered clients (found but not in registered list)
  const getUnregisteredClients = useCallback(() => {
    const registeredClientIds = new Set(allClients.map(c => c.clientId));
    return activeClients.filter(ac => !registeredClientIds.has(ac.clientId));
  }, [activeClients, allClients]);

  // Check if a registered client is currently online
  // First check active polling clients, then fall back to registered client status
  const isClientOnline = useCallback((clientId: string) => {
    // Check active polling clients first (most real-time)
    const activeClient = activeClients.find(ac => ac.clientId === clientId);
    if (activeClient) {
      return activeClient.online;
    }
    // Fall back to registered client status (which now reflects real-time polling state from server)
    const registeredClient = allClients.find(c => c.clientId === clientId);
    return registeredClient?.status === 'online';
  }, [activeClients, allClients]);

  // Group all clients by location
  const clientsByLocation = React.useMemo(() => {
    const grouped: Record<string, PrintClient[]> = {};
    
    allClients.forEach(client => {
      const locId = client.locationId || 'unassigned';
      if (!grouped[locId]) {
        grouped[locId] = [];
      }
      grouped[locId].push(client);
    });
    
    return grouped;
  }, [allClients]);

  // Get location name by ID
  const getLocationName = (locationId: string) => {
    if (locationId === 'unassigned') return 'Unassigned';
    const location = locations.find(l => l.id === locationId);
    return location?.name || locationId;
  };

  // Fetch printers for a specific client
  const fetchClientPrinters = useCallback(async (client: PrintClient) => {
    // Use clientId (the unique identifier) to fetch printers
    const clientIdentifier = client.clientId;
    
    if (loadingPrinters.has(clientIdentifier)) return;
    
    setLoadingPrinters(prev => new Set(prev).add(clientIdentifier));
    
    try {
      const printers = await PrintApiService.getPrintClientPrinters(clientIdentifier);
      setClientPrinters(prev => ({
        ...prev,
        [clientIdentifier]: printers
      }));
    } catch (err: any) {
      console.error(`Failed to fetch printers for client ${clientIdentifier}:`, err);
    } finally {
      setLoadingPrinters(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientIdentifier);
        return newSet;
      });
    }
  }, [loadingPrinters]);

  // Toggle client expansion
  const toggleClientExpanded = (client: PrintClient) => {
    const clientId = client.id;
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
        // Fetch printers when expanding if not already loaded
        if (!clientPrinters[client.clientId]) {
          fetchClientPrinters(client);
        }
      }
      return newSet;
    });
  };

  // Toggle location expansion
  const toggleLocationExpanded = (locationId: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  // Open dialog for new client
  const handleAddClient = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      locationId: selectedLocationId,
      clientId: `print-client-${Date.now()}`,
      description: ''
    });
    setFormError(null);
    setDialogOpen(true);
  };

  // Register a found client (pre-fill dialog with found client info)
  const handleRegisterFoundClient = (foundClient: ActivePollingClient) => {
    setEditingClient(null);
    setFormData({
      name: foundClient.name || `Print Client`,
      locationId: selectedLocationId,
      clientId: foundClient.clientId,
      description: foundClient.description || 'Auto-discovered print client'
    });
    setFormError(null);
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEditClient = (client: PrintClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      locationId: client.locationId,
      clientId: client.clientId,
      description: client.description || ''
    });
    setFormError(null);
    setDialogOpen(true);
  };

  // Save client
  const handleSaveClient = async () => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.locationId) {
      setFormError('Location is required');
      return;
    }
    if (!formData.clientId.trim()) {
      setFormError('Client ID is required');
      return;
    }
    
    setSaving(true);
    setFormError(null);
    
    try {
      if (editingClient && editingClient.id) {
        // Update existing registered client by database ID
        console.log('Updating print client by ID:', editingClient.id, formData);
        await PrintApiService.updatePrintClient(editingClient.id, {
          name: formData.name,
          locationId: formData.locationId,
          description: formData.description
        });
      } else {
        // Use upsert for new registrations - this handles the case where 
        // a client already exists in the database but isn't showing in the current location
        console.log('Upserting print client:', formData.clientId, formData);
        await PrintApiService.upsertPrintClient(formData.clientId, {
          name: formData.name,
          locationId: formData.locationId,
          description: formData.description
        });
      }
      
      setDialogOpen(false);
      setEditingClient(null); // Reset editing state
      loadClients();
    } catch (err: any) {
      console.error('Save client error:', err);
      setFormError(err.message || 'Failed to save print client');
    } finally {
      setSaving(false);
    }
  };

  // Delete client
  const handleDeleteClick = (client: PrintClient) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      await PrintApiService.deletePrintClient(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      loadClients();
    } catch (err: any) {
      setError(err.message || 'Failed to delete print client');
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <OnlineIcon color="success" />;
      case 'offline':
        return <OfflineIcon color="disabled" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <OfflineIcon color="disabled" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string): 'success' | 'default' | 'error' => {
    switch (status) {
      case 'online':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const unregisteredClients = getUnregisteredClients();

  // Format last seen time
  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          <ComputerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Print Clients
          {isConnected && (
            <Chip 
              size="small" 
              label="Live" 
              color="success" 
              variant="outlined" 
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
            />
          )}
        </Typography>
        <Box>
          <Tooltip title="Refresh All">
            <IconButton onClick={() => { loadClients(); loadActiveClients(); }} disabled={loading || loadingActive}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClient}
            disabled={!selectedLocationId}
          >
            Add Client
          </Button>
        </Box>
      </Box>

      {/* Location Filter */}
      {showLocationFilter && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Location</InputLabel>
          <Select
            value={selectedLocationId}
            label="Location"
            onChange={(e) => setSelectedLocationId(e.target.value)}
          >
            {locations.map(location => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ==================== FOUND CLIENTS SECTION ==================== */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<WifiIcon color={unregisteredClients.length > 0 ? 'success' : 'disabled'} />}
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6">Found Clients</Typography>
              <Chip 
                size="small" 
                label={unregisteredClients.length} 
                color={unregisteredClients.length > 0 ? 'success' : 'default'}
              />
            </Box>
          }
          subheader="Print clients detected on the network that haven't been registered yet"
          action={
            <Tooltip title="Refresh Found Clients">
              <IconButton onClick={loadActiveClients} disabled={loadingActive}>
                {loadingActive ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          {loadingActive && unregisteredClients.length === 0 && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          )}
          
          {!loadingActive && unregisteredClients.length === 0 && (
            <Alert severity="info" icon={<WifiOffIcon />}>
              No unregistered print clients found. Start a print client application and it will appear here automatically.
            </Alert>
          )}
          
          {unregisteredClients.length > 0 && (
            <Grid container spacing={2}>
              {unregisteredClients.map((client) => (
                <Grid item xs={12} sm={6} md={4} key={client.clientId}>
                  <Card variant="outlined" sx={{ 
                    borderColor: client.online ? 'success.main' : 'grey.300',
                    bgcolor: client.online ? 'success.50' : 'background.paper'
                  }}>
                    <CardHeader
                      avatar={
                        client.online ? (
                          <OnlineIcon color="success" />
                        ) : (
                          <OfflineIcon color="disabled" />
                        )
                      }
                      title={
                        <Typography variant="h6" fontWeight="bold" noWrap>
                          {client.name}
                        </Typography>
                      }
                      subheader={
                        <Chip 
                          size="small" 
                          label={client.online ? 'Online' : 'Offline'} 
                          color={client.online ? 'success' : 'default'}
                          sx={{ mt: 0.5 }}
                        />
                      }
                      sx={{ pb: 0 }}
                    />
                    <CardContent sx={{ pt: 1, pb: 1 }}>
                      <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        <strong>Client ID:</strong> {client.clientId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" display="block">
                        <strong>Last seen:</strong> {formatLastSeen(client.lastSeen)}
                      </Typography>
                      {client.description && (
                        <Typography variant="body2" color="text.secondary" display="block" sx={{ mt: 0.5 }} noWrap>
                          {client.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="medium"
                        variant="contained"
                        color="primary"
                        startIcon={<RegisterIcon />}
                        onClick={() => handleRegisterFoundClient(client)}
                        disabled={!selectedLocationId}
                        fullWidth
                      >
                        Register "{client.name}"
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* ==================== REGISTERED CLIENTS SECTION (Grouped by Location) ==================== */}
      <Card>
        <CardHeader
          avatar={<BusinessIcon color="primary" />}
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6">All Registered Clients</Typography>
              <Chip 
                size="small" 
                label={allClients.length} 
                color="primary"
                variant="outlined"
              />
            </Box>
          }
          subheader="Print clients registered across all locations"
        />
        <CardContent>
          {/* Loading */}
          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Empty State */}
          {!loading && allClients.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ComputerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Registered Clients
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Register a found client above or add one manually.
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddClient}>
                Add Manually
              </Button>
            </Box>
          )}

          {/* Clients Grouped by Location */}
          {!loading && allClients.length > 0 && (
            <Box>
              {Object.entries(clientsByLocation).map(([locationId, locationClients]) => {
                const isExpanded = expandedLocations.has(locationId);
                const locationName = getLocationName(locationId);
                const onlineCount = locationClients.filter(c => isClientOnline(c.clientId)).length;
                
                return (
                  <Paper 
                    key={locationId} 
                    variant="outlined" 
                    sx={{ 
                      mb: 2, 
                      overflow: 'hidden',
                      borderColor: locationId === selectedLocationId ? 'primary.main' : 'divider',
                      borderWidth: locationId === selectedLocationId ? 2 : 1
                    }}
                  >
                    {/* Location Header */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        bgcolor: 'action.hover',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                      onClick={() => toggleLocationExpanded(locationId)}
                    >
                      <LocationIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1 }}>
                        {locationName}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${locationClients.length} client${locationClients.length !== 1 ? 's' : ''}`}
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      {onlineCount > 0 && (
                        <Chip
                          size="small"
                          icon={<OnlineIcon />}
                          label={`${onlineCount} online`}
                          color="success"
                          sx={{ mr: 1 }}
                        />
                      )}
                      <IconButton size="small">
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                    
                    {/* Location Clients */}
                    <Collapse in={isExpanded}>
                      <List disablePadding>
                        {locationClients.map((client, index) => {
                          const clientOnline = isClientOnline(client.clientId);
                          return (
                            <React.Fragment key={client.id}>
                              {index > 0 && <Divider />}
                              <ListItem
                                sx={{ 
                                  cursor: 'pointer',
                                  pl: 4,
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                                onClick={() => {
                                  toggleClientExpanded(client);
                                  onClientSelect?.(client);
                                }}
                              >
                                <Box sx={{ mr: 2 }}>
                                  {clientOnline ? <OnlineIcon color="success" /> : <OfflineIcon color="disabled" />}
                                </Box>
                                <ListItemText
                                  primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <ComputerIcon fontSize="small" color="action" />
                                      <Typography variant="subtitle1" fontWeight="medium" component="span">
                                        {client.name}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={clientOnline ? 'online' : 'offline'}
                                        color={clientOnline ? 'success' : 'default'}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Box component="span" sx={{ display: 'block' }}>
                                      <Typography variant="body2" color="text.secondary" component="span" display="block">
                                        Client ID: {client.clientId}
                                      </Typography>
                                      {client.description && (
                                        <Typography variant="body2" color="text.secondary" component="span" display="block">
                                          {client.description}
                                        </Typography>
                                      )}
                                      {client.lastSeen && (
                                        <Typography variant="caption" color="text.secondary" component="span" display="block">
                                          Last seen: {new Date(client.lastSeen).toLocaleString()}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <Tooltip title="Edit">
                                    <IconButton onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}>
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(client); }}>
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <IconButton onClick={(e) => { e.stopPropagation(); toggleClientExpanded(client); }}>
                                    {expandedClients.has(client.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                              
                              {/* Expanded Printer List */}
                              <Collapse in={expandedClients.has(client.id)}>
                                <Box sx={{ pl: 8, pr: 2, pb: 2, bgcolor: 'grey.50' }}>
                                  {loadingPrinters.has(client.clientId) ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                                      <CircularProgress size={16} />
                                      <Typography variant="body2" color="text.secondary">
                                        Loading printers...
                                      </Typography>
                                    </Box>
                                  ) : clientPrinters[client.clientId] && clientPrinters[client.clientId].length > 0 ? (
                                    <List dense disablePadding>
                                      <Typography variant="subtitle2" sx={{ pt: 1, pb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <PrintIcon fontSize="small" />
                                        Connected Printers ({clientPrinters[client.clientId].length})
                                      </Typography>
                                      {clientPrinters[client.clientId].map((printer) => (
                                        <ListItem key={printer.id} sx={{ py: 0.5, pl: 2 }}>
                                          <ListItemIcon sx={{ minWidth: 32 }}>
                                            <PrintIcon fontSize="small" color={printer.status === 'online' ? 'success' : 'disabled'} />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={printer.name}
                                            secondary={
                                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" color="text.secondary" component="span">
                                                  {printer.model || 'Unknown model'}
                                                </Typography>
                                                {printer.connectionType && (
                                                  <Chip 
                                                    size="small" 
                                                    label={printer.connectionType} 
                                                    sx={{ height: 16, fontSize: '0.65rem' }}
                                                  />
                                                )}
                                              </Box>
                                            }
                                            primaryTypographyProps={{ variant: 'body2' }}
                                          />
                                          <Chip
                                            size="small"
                                            label={printer.status || 'unknown'}
                                            color={printer.status === 'online' ? 'success' : printer.status === 'error' ? 'error' : 'default'}
                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Box sx={{ py: 2 }}>
                                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <PrintIcon fontSize="small" />
                                        No printers registered for this client
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Start the print client application to register printers automatically
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Collapse>
                            </React.Fragment>
                          );
                        })}
                      </List>
                    </Collapse>
                  </Paper>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => {
          setDialogOpen(false);
          setEditingClient(null);
          setFormError(null);
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {editingClient ? 'Edit Print Client' : 'Add Print Client'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            placeholder="e.g., Main Office Invoice Printer"
            helperText="A friendly name to identify this print client"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Location</InputLabel>
            <Select
              value={formData.locationId}
              label="Location"
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            >
              {locations.map(location => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Which company/location this print client belongs to
            </Typography>
          </FormControl>
          
          <TextField
            fullWidth
            label="Client ID"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            margin="normal"
            disabled={!!editingClient}
            helperText={editingClient 
              ? "Client ID cannot be changed after creation" 
              : "Unique identifier for this client (auto-generated, can be customized)"
            }
          />
          
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            placeholder="Optional description of this print client's purpose"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveClient} 
            variant="contained" 
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : (editingClient ? 'Save' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Print Client</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the print client "{clientToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will unlink all printers associated with this client. The printers will need to be re-registered.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrintClientManager;
