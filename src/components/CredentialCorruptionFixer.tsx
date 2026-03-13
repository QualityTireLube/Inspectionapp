/**
 * Credential Corruption Fixer
 * 
 * Helps users resolve credential corruption issues by providing
 * guidance and reset options
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

interface CredentialCorruptionFixerProps {
  open: boolean;
  onClose: () => void;
  error: string;
  provider: 'partstech' | 'nexpart';
}

const CredentialCorruptionFixer: React.FC<CredentialCorruptionFixerProps> = ({
  open,
  onClose,
  error,
  provider
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleGoToSettings = () => {
    window.location.href = `/settings?section=${provider}`;
    onClose();
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const providerName = provider === 'partstech' ? 'Parts Tech' : 'NexPart';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {providerName} Credential Issue Detected
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Credential data format issue detected</strong>
          </Typography>
          <Typography variant="body2">
            Your {providerName} credentials may need to be re-configured due to a system update. 
            This is a one-time fix that will restore full functionality.
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          Quick Fix Steps:
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <SettingsIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Go to Settings"
              secondary={`Navigate to Settings → ${providerName} API to reconfigure your credentials`}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <RefreshIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Re-enter Credentials"
              secondary="Enter your existing credentials again and save them"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Test Connection"
              secondary="Use the test button to verify everything works correctly"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Alert severity="info">
          <Typography variant="body2" gutterBottom>
            <strong>Why this happened:</strong>
          </Typography>
          <Typography variant="body2">
            Recent system updates improved security and data handling. Existing credentials 
            need to be re-saved in the new format. Your actual API keys haven't changed - 
            you'll use the same credentials you had before.
          </Typography>
        </Alert>

        {showDetails && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Technical Details:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {error}
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setShowDetails(!showDetails)} size="small">
          {showDetails ? 'Hide' : 'Show'} Technical Details
        </Button>
        <Button onClick={handleRefreshPage} color="secondary">
          Refresh Page
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button onClick={handleGoToSettings} variant="contained" startIcon={<SettingsIcon />}>
          Fix in Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CredentialCorruptionFixer;
