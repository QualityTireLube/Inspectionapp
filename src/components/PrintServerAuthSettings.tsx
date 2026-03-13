import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface PrintServerAuthSettingsProps {
  defaultExpanded?: boolean;
  compactMode?: boolean;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

const PrintServerAuthSettings: React.FC<PrintServerAuthSettingsProps> = ({
  defaultExpanded = false,
  compactMode = false,
  onAuthChange,
}) => {

  // Notify parent that main app is always "authenticated" to its own print endpoints
  useEffect(() => {
    onAuthChange?.(true);
  }, [onAuthChange]);

  if (compactMode) {
    return (
      <Box sx={{ minWidth: 250 }}>
        <Card sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">Print System</Typography>
              <Chip
                icon={<CheckCircleIcon />}
                label="Connected"
                color="success"
                size="small"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Print system ready - printers will be provided by print clients
            </Typography>
          </Stack>
        </Card>
      </Box>
    );
  }

  // Full mode rendering
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">Print System Status</Typography>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              icon={<CheckCircleIcon />}
              label="READY"
              color="success"
              size="small"
            />
          </Box>
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={3}>
          {/* Connection Status */}
          <Alert severity="success" icon={<CheckCircleIcon />}>
            <Typography variant="subtitle2" gutterBottom>
              Print System Ready
            </Typography>
            <Typography variant="body2">
              The print system is ready to receive printers from connected print clients.
              No additional authentication required for the main application.
            </Typography>
          </Alert>

          {/* System Info */}
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              <strong>Print System Architecture:</strong><br />
              • Main app displays printers registered by print clients<br />
              • Print clients detect local printers and register them with this server<br />
              • Print jobs are queued here and picked up by print clients<br />
              • No direct printer connections from main app required
            </Typography>
          </Alert>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default PrintServerAuthSettings; 