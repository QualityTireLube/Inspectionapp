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
  Alert
} from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Sync as ReconnectingIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Wifi as WifiIcon
} from '@mui/icons-material';
import { useWebSocket } from '../contexts/WebSocketProvider';

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
  const { connectionStatus, isConnected, reconnect } = useWebSocket();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  const getStatusIcon = () => {
    if (connectionStatus.reconnecting) {
      return <ReconnectingIcon className="spinning" />;
    }
    if (isConnected) {
      return <ConnectedIcon />;
    }
    return <DisconnectedIcon />;
  };

  const getStatusColor = (): 'success' | 'error' | 'warning' | 'default' => {
    if (connectionStatus.reconnecting) return 'warning';
    if (isConnected) return 'success';
    return 'error';
  };

  const getStatusText = () => {
    if (connectionStatus.reconnecting) return 'Reconnecting...';
    if (isConnected) return 'Online';
    if (connectionStatus.connected && !connectionStatus.authenticated) return 'Authenticating...';
    return 'Offline';
  };

  const formatLastConnected = () => {
    if (!connectionStatus.lastConnected) return 'Never';
    return connectionStatus.lastConnected.toLocaleTimeString();
  };

  if (compact) {
    return (
      <>
        <Tooltip title={`WebSocket: ${getStatusText()}`}>
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
                Connected:
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

            <MenuItem onClick={handleReconnect} disabled={connectionStatus.reconnecting}>
              <RefreshIcon sx={{ mr: 1, fontSize: 16 }} />
              <Typography variant="body2">
                {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
              </Typography>
            </MenuItem>
          </Box>
        </Menu>
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
              Connected:
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

          <MenuItem onClick={handleReconnect} disabled={connectionStatus.reconnecting}>
            <RefreshIcon sx={{ mr: 1, fontSize: 16 }} />
            <Typography variant="body2">
              {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
            </Typography>
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
};

export default ConnectionStatusIndicator; 