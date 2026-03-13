import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Divider,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Sync as ReconnectingIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Wifi as WifiIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import { useWebSocket, ServiceConnectionStatus } from '../contexts/WebSocketProvider';
import PrintApiService from '../services/printApi';
import { BrowserPrintAuthClient } from '../services/browserPrintAuth';
import { useUser } from '../contexts/UserContext';
import { ContentCopy as CopyIcon, Settings as SettingsIcon } from '@mui/icons-material';
import PrintClientTokenService from '../services/printClientTokens';
import { useNotification } from '../hooks/useNotification';
import { debug } from '../services/debugManager';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  position?: 'fixed' | 'relative';
  compact?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  position = 'fixed',
  compact = false
}) => {
  const { 
    connectionStatus, 
    isConnected, 
    reconnect,
    quickCheckServiceStatus,
    staticStickerServiceStatus,
    generatedLabelServiceStatus,
    allServicesConnected
  } = useWebSocket();
  const { user } = useUser();
  const { showNotification } = useNotification();
  
  // Check if user is admin
  const isAdmin = () => {
    const userRole = user?.role || localStorage.getItem('userRole');
    debug.log('auth', 'Checking admin status - user role:', userRole);
    return userRole === 'Admin';
  };
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [printClientConnected, setPrintClientConnected] = useState<boolean>(false);
  const [printClientPrinters, setPrintClientPrinters] = useState<number>(0);
  const [printClientLastSeen, setPrintClientLastSeen] = useState<Date | null>(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [tokenName, setTokenName] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [tokenError, setTokenError] = useState<string>('');


  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReconnect = () => {
    reconnect();
    handleClose();
  };

  // Determine overall connectivity including print client
  const overallConnected = allServicesConnected && printClientConnected;

  // Poll for print client status using active polling clients endpoint
  React.useEffect(() => {
    let isMounted = true;

    const fetchPrintClientStatus = async () => {
      try {
        // Use the active polling clients endpoint - this directly checks if clients are actively polling
        const activeClientsResponse = await PrintApiService.getActivePollingClients();
        if (!isMounted) return;

        const activeClients = activeClientsResponse.clients || [];
        const onlineClients = activeClients.filter((c: any) => c.online);
        
        // Also get printers count for display
        const printers = await PrintApiService.getPrinters();
        const clientPrinters = (printers || []).filter((p: any) => p.isFromClient || p.clientId);
        
        if (!isMounted) return;
        setPrintClientPrinters(clientPrinters.length);

        if (onlineClients.length === 0) {
          setPrintClientConnected(false);
          setPrintClientLastSeen(null);
          return;
        }

        // Find most recent lastSeen from active clients
        const latest = onlineClients
          .map((c: any) => (c.lastSeen ? new Date(c.lastSeen) : null))
          .filter((d: Date | null) => !!d) as Date[];

        const mostRecent = latest.length > 0 ? new Date(Math.max(...latest.map(d => d.getTime()))) : null;
        setPrintClientLastSeen(mostRecent);

        // Connected if any client is actively polling (online in the active clients list)
        setPrintClientConnected(onlineClients.length > 0);
      } catch {
        if (!isMounted) return;
        setPrintClientConnected(false);
        setPrintClientPrinters(0);
        setPrintClientLastSeen(null);
      }
    };

    // Initial fetch and interval - check more frequently (every 10 seconds)
    fetchPrintClientStatus();
    const interval = setInterval(fetchPrintClientStatus, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Initialize token dialog defaults when opened
  React.useEffect(() => {
    if (tokenDialogOpen) {
      const hostname = window.location.hostname;
      // Production: use api.autoflopro.com subdomain
      const url = (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com')
        ? 'https://api.autoflopro.com'
        : `https://${hostname}:5001`;
      setServerUrl(url);
      setEmail(user?.email || localStorage.getItem('userEmail') || '');
      setPassword('');
      setTokenName('Print Client Token');
      setGeneratedToken('');
      setTokenError('');
    }
  }, [tokenDialogOpen, user?.email]);

  const openTokenDialog = () => {
    setTokenDialogOpen(true);
  };

  const closeTokenDialog = () => {
    setTokenDialogOpen(false);
  };

  const handleManageTokensClick = () => {
    debug.log('general', 'Navigating to Print Token Manager page');
    handleClose();
    // Navigate to the token management page
    window.location.href = '/print-token-manager';
  };



  const handleGenerateToken = async () => {
    setGenerating(true);
    setTokenError('');
    setGeneratedToken('');
    
    if (!tokenName.trim()) {
      setTokenError('Token name is required');
      setGenerating(false);
      return;
    }
    
    try {
      const result = await PrintClientTokenService.createToken({
        name: tokenName.trim(),
        serverUrl: serverUrl.trim(),
        email: email.trim(),
        password: password
      });
      
      setGeneratedToken(result.token);
      showNotification('Permanent print client token created successfully!', 'success');
      
    } catch (e: any) {
      const errorMessage = e?.response?.data?.error || e?.message || 'Failed to create permanent token';
      setTokenError(errorMessage);
      showNotification(`Failed to create token: ${errorMessage}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const getStatusIcon = () => {
    if (connectionStatus.reconnecting) {
      return <ReconnectingIcon className="spinning" />;
    }
    // If WS is up but print client is down, show disconnected icon
    if (connectionStatus.connected && connectionStatus.authenticated && !printClientConnected) {
      return <DisconnectedIcon />;
    }
    if (overallConnected) {
      return <ConnectedIcon />;
    }
    return <DisconnectedIcon />;
  };

  const getStatusColor = (): 'success' | 'error' | 'warning' | 'default' => {
    if (connectionStatus.reconnecting) return 'warning';
    if (connectionStatus.connected && connectionStatus.authenticated && !printClientConnected) return 'error';
    if (overallConnected) return 'success';
    return 'error';
  };

  const getStatusText = () => {
    if (connectionStatus.reconnecting) return 'Reconnecting...';
    // Explicitly surface print client status when WS is up but client is down
    if (connectionStatus.connected && connectionStatus.authenticated && !printClientConnected) return 'Print Client Offline';
    if (overallConnected) return 'All Services Online';
    if (connectionStatus.connected && !connectionStatus.authenticated) return 'Authenticating...';
    if (connectionStatus.connected && connectionStatus.authenticated) return 'WebSocket Online';
    return 'WebSocket Offline';
  };

  const formatLastConnected = () => {
    // Prefer latest print client activity if available; otherwise use WS time
    const base = printClientLastSeen || connectionStatus.lastConnected;
    if (!base) return 'Never';
    return base.toLocaleTimeString();
  };

  const getServiceStatusIcon = (status: ServiceConnectionStatus) => {
    return status.connected ? 
      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> : 
      <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
  };

  const formatServiceLastUpdate = (status: ServiceConnectionStatus) => {
    if (!status.lastUpdate) return 'Never';
    return status.lastUpdate.toLocaleTimeString();
  };

  if (compact) {
    return (
      <>
        <Tooltip title={`Connection Status: ${getStatusText()}`}>
          <IconButton 
            size="small" 
            onClick={handleClick}
            sx={{ 
              color: getStatusColor() === 'success' ? 'success.main' : 
                     getStatusColor() === 'error' ? 'error.main' : 
                     'warning.main'
            }}
          >
            <WifiIcon />
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 280, p: 1 }
          }}
        >
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              WebSocket Connection Status
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {getStatusIcon()}
              <Typography variant="body2" fontWeight="medium">
                {getStatusText()}
              </Typography>
            </Box>

            {connectionStatus.reconnecting && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Attempting to reconnect...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                WebSocket Connected:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {connectionStatus.connected ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography variant="caption">
                  {connectionStatus.connected ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Authenticated:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {connectionStatus.authenticated ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography variant="caption">
                  {connectionStatus.authenticated ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              Service Status:
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Quick Checks:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getServiceStatusIcon(quickCheckServiceStatus)}
                <Typography variant="caption">
                  {quickCheckServiceStatus.connected ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Static Stickers:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getServiceStatusIcon(staticStickerServiceStatus)}
                <Typography variant="caption">
                  {staticStickerServiceStatus.connected ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Generated Labels:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getServiceStatusIcon(generatedLabelServiceStatus)}
                <Typography variant="caption">
                  {generatedLabelServiceStatus.connected ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, cursor: !printClientConnected ? 'pointer' : 'default' }}
                 onClick={() => { if (!printClientConnected) { handleClose(); openTokenDialog(); } }}>
              <Typography variant="caption" color="text.secondary">
                Print Client:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {printClientConnected ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography variant="caption">
                  {printClientConnected ? 'Connected' : 'Not Connected'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Client Printers:
              </Typography>
              <Typography variant="caption">
                {printClientPrinters}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Last Connected:
              </Typography>
              <Typography variant="caption">
                {formatLastConnected()}
              </Typography>
            </Box>

            {connectionStatus.connectedClients !== undefined && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Connected Users:
                </Typography>
                <Typography variant="caption">
                  {connectionStatus.connectedClients}
                </Typography>
              </Box>
            )}

            {connectionStatus.lastError && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }} variant="outlined">
                <Typography variant="caption">
                  {connectionStatus.lastError}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 1 }} />
            
            {isAdmin() && (
              <MenuItem onClick={handleManageTokensClick}>
                <SettingsIcon sx={{ mr: 1, fontSize: 16 }} />
                <Typography variant="body2">Manage Print Client Tokens</Typography>
              </MenuItem>
            )}
            
            <MenuItem onClick={() => { handleClose(); openTokenDialog(); }}>
              <VpnKeyIcon sx={{ mr: 1, fontSize: 16 }} />
              <Typography variant="body2">Create Permanent Print Client Token</Typography>
            </MenuItem>

            <MenuItem onClick={handleReconnect} disabled={connectionStatus.reconnecting}>
              <RefreshIcon sx={{ mr: 1, fontSize: 16 }} />
              <Typography variant="body2">
                {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
              </Typography>
            </MenuItem>
          </Box>
        </Menu>

        {/* Token Generation Dialog (compact mode) */}
        <Dialog open={tokenDialogOpen} onClose={closeTokenDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Create Permanent Print Client Token</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                Create a permanent token for the print client. This token will be saved to the database and can be managed from the token management interface.
              </Alert>
              <TextField
                label="Token Name"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g., Main Office Printer Token"
                fullWidth
                required
              />
              <TextField
                label="Server URL"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                fullWidth
              />
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              {tokenError && (
                <Alert severity="error">{tokenError}</Alert>
              )}
              {generatedToken && (
                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary">Token</Typography>
                  <TextField
                    value={generatedToken}
                    multiline
                    minRows={2}
                    InputProps={{ readOnly: true }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<CopyIcon />} onClick={() => copyToClipboard(generatedToken)}>
                      Copy Token
                    </Button>
                    <Button size="small" startIcon={<CopyIcon />} onClick={() => copyToClipboard(serverUrl)}>
                      Copy Server URL
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeTokenDialog}>Close</Button>
            <Button variant="contained" onClick={handleGenerateToken} disabled={generating || !email || !password || !serverUrl || !tokenName.trim()}>
              {generating ? 'Creating...' : generatedToken ? 'Create Another' : 'Create Permanent Token'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          position: position,
          top: position === 'fixed' ? 16 : 'auto',
          right: position === 'fixed' ? 16 : 'auto',
          zIndex: position === 'fixed' ? 1200 : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Chip
          icon={<WifiIcon />}
          label={getStatusText()}
          color={getStatusColor()}
          variant={isConnected ? 'filled' : 'outlined'}
          onClick={handleClick}
          clickable
          size="small"
          data-testid="connection-indicator"
          sx={{
            '& .spinning': {
              animation: 'spin 1s linear infinite',
            },
            '@keyframes spin': {
              '0%': {
                transform: 'rotate(0deg)',
              },
              '100%': {
                transform: 'rotate(360deg)',
              },
            }
          }}
        />

        {showDetails && connectionStatus.connectedClients !== undefined && (
          <Chip
            icon={<InfoIcon />}
            label={`${connectionStatus.connectedClients} connected`}
            variant="outlined"
            size="small"
          />
        )}

        {!isConnected && !connectionStatus.reconnecting && (
          <Tooltip title="Reconnect">
            <IconButton size="small" onClick={handleReconnect}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 280, p: 1 }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            WebSocket Connection Status
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {getStatusIcon()}
            <Typography variant="body2" fontWeight="medium">
              {getStatusText()}
            </Typography>
          </Box>

          {connectionStatus.reconnecting && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Attempting to reconnect...
              </Typography>
                             <LinearProgress />
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              WebSocket Connected:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {connectionStatus.connected ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography variant="caption">
                {connectionStatus.connected ? 'Yes' : 'No'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Authenticated:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {connectionStatus.authenticated ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography variant="caption">
                {connectionStatus.authenticated ? 'Yes' : 'No'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            Service Status:
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Quick Checks:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getServiceStatusIcon(quickCheckServiceStatus)}
              <Typography variant="caption">
                {quickCheckServiceStatus.connected ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Static Stickers:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getServiceStatusIcon(staticStickerServiceStatus)}
              <Typography variant="caption">
                {staticStickerServiceStatus.connected ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Generated Labels:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getServiceStatusIcon(generatedLabelServiceStatus)}
              <Typography variant="caption">
                {generatedLabelServiceStatus.connected ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, cursor: !printClientConnected ? 'pointer' : 'default' }}
               onClick={() => { if (!printClientConnected) { handleClose(); openTokenDialog(); } }}>
            <Typography variant="caption" color="text.secondary">
              Print Client:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {printClientConnected ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography variant="caption">
                {printClientConnected ? 'Connected' : 'Not Connected'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Client Printers:
            </Typography>
            <Typography variant="caption">
              {printClientPrinters}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Last Connected:
            </Typography>
            <Typography variant="caption">
              {formatLastConnected()}
            </Typography>
          </Box>

          {connectionStatus.connectedClients !== undefined && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Connected Users:
              </Typography>
              <Typography variant="caption">
                {connectionStatus.connectedClients}
              </Typography>
            </Box>
          )}

          {connectionStatus.lastError && (
            <Alert severity="error" sx={{ mt: 1, mb: 1 }} variant="outlined">
              <Typography variant="caption">
                {connectionStatus.lastError}
              </Typography>
            </Alert>
          )}

          <Divider sx={{ my: 1 }} />
          
          {isAdmin() && (
            <MenuItem onClick={handleManageTokensClick}>
              <SettingsIcon sx={{ mr: 1, fontSize: 16 }} />
              <Typography variant="body2">Manage Print Client Tokens</Typography>
            </MenuItem>
          )}

          <MenuItem onClick={() => { handleClose(); openTokenDialog(); }}>
            <VpnKeyIcon sx={{ mr: 1, fontSize: 16 }} />
            <Typography variant="body2">Create Permanent Print Client Token</Typography>
          </MenuItem>

          <MenuItem onClick={handleReconnect} disabled={connectionStatus.reconnecting}>
            <RefreshIcon sx={{ mr: 1, fontSize: 16 }} />
            <Typography variant="body2">
              {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
            </Typography>
          </MenuItem>
        </Box>
      </Menu>

      {/* Token Generation Dialog */}
      <Dialog open={tokenDialogOpen} onClose={closeTokenDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Permanent Print Client Token</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Create a permanent token for the print client. This token will be saved to the database and can be managed from the token management interface.
            </Alert>
            <TextField
              label="Token Name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="e.g., Main Office Printer Token"
              fullWidth
              required
            />
            <TextField
              label="Server URL"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            {tokenError && (
              <Alert severity="error">{tokenError}</Alert>
            )}
            {generatedToken && (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">Token</Typography>
                <TextField
                  value={generatedToken}
                  multiline
                  minRows={2}
                  InputProps={{ readOnly: true }}
                />
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<CopyIcon />} onClick={() => copyToClipboard(generatedToken)}>
                    Copy Token
                  </Button>
                  <Button size="small" startIcon={<CopyIcon />} onClick={() => copyToClipboard(serverUrl)}>
                    Copy Server URL
                  </Button>
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTokenDialog}>Close</Button>
          <Button variant="contained" onClick={handleGenerateToken} disabled={generating || !email || !password || !serverUrl || !tokenName.trim()}>
            {generating ? 'Creating...' : generatedToken ? 'Create Another' : 'Create Permanent Token'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConnectionStatusIndicator; 