import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import PrintServerAuthSettings from './PrintServerAuthSettings';

/**
 * Demo component to showcase the Print Server Authentication UI
 * This can be used for testing and demonstration purposes
 */
const PrintServerAuthDemo: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Print Server Authentication Demo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Test the print server authentication system with your server at 172.20.10.9:5001
          </Typography>
        </Box>

        <Divider />

        {/* Full Mode */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Full Authentication Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Complete authentication interface with all features and status information.
          </Typography>
          
          <PrintServerAuthSettings 
            defaultExpanded={true}
            compactMode={false}
            onAuthChange={(isAuthenticated) => {
              console.log('Auth status changed:', isAuthenticated);
            }}
          />
        </Paper>

        {/* Compact Mode */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Compact Authentication Widget
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Minimal authentication interface suitable for embedding in other components.
          </Typography>
          
          <PrintServerAuthSettings 
            compactMode={true}
            onAuthChange={(isAuthenticated) => {
              console.log('Compact auth status changed:', isAuthenticated);
            }}
          />
        </Paper>

        {/* Usage Instructions */}
        <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h5" gutterBottom>
            Usage Instructions
          </Typography>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                1. Default Configuration
              </Typography>
              <Typography variant="body2">
                • Server URL is pre-configured to <code>172.20.10.9:5001</code><br />
                • SSL verification is disabled by default for IP-based servers<br />
                • Tokens are automatically saved and reused
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                2. Authentication Process
              </Typography>
              <Typography variant="body2">
                • Click "Connect to Print Server" to open the login dialog<br />
                • Enter your email and password<br />
                • The system will authenticate and save your token<br />
                • Token status and expiration time are displayed
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                3. Integration in Print Settings
              </Typography>
              <Typography variant="body2">
                • This component is now integrated into the Print Manager<br />
                • Go to Settings → Print Settings to access it<br />
                • Authentication state affects print API availability
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                4. API Usage
              </Typography>
              <Typography variant="body2">
                • Once authenticated, all print API calls automatically use the token<br />
                • No additional configuration needed in your components<br />
                • Token expiration is handled automatically
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default PrintServerAuthDemo; 