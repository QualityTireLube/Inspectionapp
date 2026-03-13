import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import PrintApiService from '../services/printApi';
import { useWebSocket } from '../contexts/WebSocketProvider';

// Type for active polling client
interface ActivePollingClient {
  clientId: string;
  online: boolean;
  lastSeen: string | null;
  id: string | null;
  name: string;
  locationId: string | null;
  description: string | null;
}

interface PrintClientSelectorProps {
  value?: string; // Selected client ID
  onChange?: (clientId: string | null, client: ActivePollingClient | null) => void;
  label?: string;
  showOffline?: boolean; // Whether to show offline clients
  locationId?: string; // Filter by location
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
  helperText?: string;
  required?: boolean;
  autoRefresh?: boolean; // Auto-refresh on WebSocket updates
  refreshInterval?: number; // Manual refresh interval in ms (default: 30000)
}

const PrintClientSelector: React.FC<PrintClientSelectorProps> = ({
  value = '',
  onChange,
  label = 'Print Client',
  showOffline = false,
  locationId,
  fullWidth = true,
  size = 'medium',
  disabled = false,
  helperText,
  required = false,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [clients, setClients] = useState<ActivePollingClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // WebSocket for real-time updates
  const { subscribe, isConnected } = useWebSocket();

  // Fetch active polling clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await PrintApiService.getActivePollingClients();
      let activeClients = response.clients;
      
      // Filter by location if specified
      if (locationId) {
        activeClients = activeClients.filter(c => c.locationId === locationId || c.locationId === null);
      }
      
      // Filter out offline clients if not showing them
      if (!showOffline) {
        activeClients = activeClients.filter(c => c.online);
      }
      
      setClients(activeClients);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Failed to fetch active polling clients:', err);
      setError('Failed to load print clients');
    } finally {
      setLoading(false);
    }
  }, [locationId, showOffline]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Subscribe to print_client_summary WebSocket events for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;
    
    const unsubscribe = subscribe('print_client_summary', (message: any) => {
      // Refresh the client list when we get a print client status update
      console.log('🖨️ Print client summary received, refreshing client list');
      fetchClients();
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, autoRefresh, fetchClients]);

  // Manual refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      fetchClients();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchClients]);

  // Handle selection change
  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value;
    
    if (selectedId === '') {
      onChange?.(null, null);
    } else {
      const selectedClient = clients.find(c => c.clientId === selectedId) || null;
      onChange?.(selectedId, selectedClient);
    }
  };

  // Get status indicator
  const getStatusChip = (client: ActivePollingClient) => {
    if (client.online) {
      return (
        <Chip
          size="small"
          icon={<OnlineIcon />}
          label="Online"
          color="success"
          sx={{ ml: 1, height: 20 }}
        />
      );
    }
    return (
      <Chip
        size="small"
        icon={<OfflineIcon />}
        label="Offline"
        color="default"
        sx={{ ml: 1, height: 20 }}
      />
    );
  };

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

  const hasOnlineClients = clients.some(c => c.online);

  return (
    <Box>
      <FormControl fullWidth={fullWidth} size={size} disabled={disabled} required={required}>
        <InputLabel id="print-client-selector-label">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ComputerIcon fontSize="small" />
            {label}
          </Box>
        </InputLabel>
        <Select
          labelId="print-client-selector-label"
          id="print-client-selector"
          value={value}
          label={label}
          onChange={handleChange}
          endAdornment={
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
              <Tooltip title={`Refresh (Last: ${lastRefresh ? formatLastSeen(lastRefresh.toISOString()) : 'Never'})`}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchClients();
                  }}
                  disabled={loading}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
        >
          <MenuItem value="">
            <em>None (No print client selected)</em>
          </MenuItem>
          
          {clients.length === 0 && !loading && (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No active print clients detected
              </Typography>
            </MenuItem>
          )}
          
          {clients.map((client) => (
            <MenuItem key={client.clientId} value={client.clientId}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ComputerIcon fontSize="small" sx={{ mr: 1, color: client.online ? 'success.main' : 'text.disabled' }} />
                  <Box>
                    <Typography variant="body2" component="span">
                      {client.name}
                    </Typography>
                    {client.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({client.description})
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getStatusChip(client)}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, minWidth: 50 }}>
                    {formatLastSeen(client.lastSeen)}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
        
        {helperText && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
            {helperText}
          </Typography>
        )}
      </FormControl>

      {/* Status indicators */}
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        {!loading && clients.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {hasOnlineClients ? (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OnlineIcon fontSize="inherit" color="success" />
                {clients.filter(c => c.online).length} client{clients.filter(c => c.online).length !== 1 ? 's' : ''} online
              </Box>
            ) : (
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OfflineIcon fontSize="inherit" color="disabled" />
                No clients online
              </Box>
            )}
          </Typography>
        )}
        
        {!loading && clients.length === 0 && (
          <Alert severity="info" sx={{ py: 0, px: 1 }}>
            <Typography variant="caption">
              No print clients detected. Start a print client application to enable printing.
            </Typography>
          </Alert>
        )}
        
        {isConnected && (
          <Tooltip title="Real-time updates enabled">
            <Chip
              size="small"
              label="Live"
              color="success"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Tooltip>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default PrintClientSelector;
