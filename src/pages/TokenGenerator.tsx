import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Divider,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  VpnKey as TokenIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Computer as ServerIcon,
  Print as PrintIcon,
  Queue as QueueIcon,
  Settings as ConfigIcon,
} from '@mui/icons-material';

import { useNotification } from '../hooks/useNotification';
import { BrowserPrintAuthClient } from '../services/browserPrintAuth';

interface TokenData {
  token: string;
  email: string;
  role: string;
  userId: string;
  expiresAt: string;
  serverUrl: string;
}

interface PrintEndpoint {
  name: string;
  method: string;
  url: string;
  description: string;
  icon: React.ReactNode;
}

const TokenGenerator: React.FC = () => {
  const { showNotification } = useNotification();

  // Dynamic server URL generator (same logic as api.ts)
  const getServerUrl = () => {
    try {
      // Use environment variable if set
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      if (envUrl) {
        // Remove '/api' from the end to get just the server URL
        return envUrl.replace('/api', '');
      }
      
      const hostname = window.location.hostname;
      
      // Production: use api.autoflopro.com subdomain
      if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
        const productionUrl = 'https://api.autoflopro.com';
        console.log('🔗 Using production server URL:', productionUrl);
        return productionUrl;
      }
      
      // Always use HTTPS for security
      const protocol = 'https';
      
      // In development, use direct HTTPS connection to port 5001
      if (import.meta.env.DEV) {
        const serverUrl = `${protocol}://${hostname}:5001`;
        console.log('🔗 Using development server URL:', serverUrl);
        return serverUrl;
      }
      
      // Fallback for other environments
      const fallbackUrl = `${protocol}://${hostname}:5001`;
      console.log('🔗 Using fallback server URL:', fallbackUrl);
      return fallbackUrl;
      
    } catch (error) {
      console.error('Error generating server URL:', error);
      // Fallback to current origin
      return window.location.origin;
    }
  };

  // Form state - now uses dynamic server URL!
  const [serverUrl, setServerUrl] = useState(getServerUrl());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Token state
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  // URLs for print client to connect to THIS QuickCheck app
  const currentAppUrl = window.location.origin; // Gets the current app's URL
  const backendServerUrl = getServerUrl(); // Gets the backend server URL (port 5001)
  
  const printEndpoints: PrintEndpoint[] = [
    {
      name: '🖨️ Get Available Printers',
      method: 'GET',
      url: `${backendServerUrl}/api/print/printers`,
      description: '⭐ REQUIRED: Your print client connects to the backend server to get printers',
      icon: <ServerIcon color="error" />
    },
    {
      name: '📄 Submit Print Jobs', 
      method: 'POST',
      url: `${backendServerUrl}/api/print/jobs`,
      description: '⭐ REQUIRED: Your print client sends jobs to the backend server',
      icon: <PrintIcon color="error" />
    },
    {
      name: '📋 Get Print Jobs',
      method: 'GET', 
      url: `${backendServerUrl}/api/print/jobs`,
      description: 'Optional: Check status of print jobs on the backend server',
      icon: <QueueIcon color="info" />
    },
    {
      name: '📊 Print Queue Status',
      method: 'GET',
      url: `${backendServerUrl}/api/print/queue`, 
      description: 'Optional: Monitor print queue on the backend server',
      icon: <QueueIcon color="info" />
    }
  ];

  const handleGenerateToken = async () => {
    if (!serverUrl || !email || !password) {
      showNotification('Please enter server URL, email, and password', 'error');
      return;
    }

    setLoading(true);
    try {
      // Create browser-compatible auth client
      const authClient = new BrowserPrintAuthClient(serverUrl.trim());
      
      // Attempt login
      const result = await authClient.login({
        email: email.trim(),
        password: password,
      });

      console.log('Login result:', result); // Debug logging

      // Get additional info
      const userInfo = authClient.getUserInfo();
      const tokenInfo = authClient.getTokenInfo();
      const actualToken = authClient.getToken();
      
      console.log('User info:', userInfo); // Debug logging
      console.log('Token info:', tokenInfo); // Debug logging
      console.log('Actual token:', actualToken); // Debug logging
      
      if (result && actualToken) {
        const tokenData: TokenData = {
          token: actualToken,
          email: result.email,
          role: result.role,
          userId: result.userId,
          expiresAt: tokenInfo.expiresAt?.toISOString() || '',
          serverUrl: serverUrl.trim()
        };
        
        setTokenData(tokenData);
        showNotification('Token generated successfully!', 'success');
      } else {
        showNotification('Token generated but could not retrieve details.', 'warning');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate token';
      showNotification(`Authentication failed: ${message}`, 'error');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(label));
      showNotification(`${label} copied to clipboard!`, 'success');
      
      // Clear the copied indicator after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(label);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const formatExpirationTime = (expiresAt: string): string => {
    if (!expiresAt) return 'Unknown';
    
    const expDate = new Date(expiresAt);
    const now = new Date();
    const timeDiff = expDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'Expired';
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const resetForm = () => {
    setServerUrl(getServerUrl()); // Reset to current dynamic URL
    setEmail('');
    setPassword('');
    setTokenData(null);
    setCopiedItems(new Set());
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box textAlign="center">
          <Typography variant="h4" gutterBottom>
            🔑 Authentication Token Display
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and display authentication tokens for manual copying to your print client
          </Typography>
        </Box>

        {/* Token Generation Form */}
        <Card>
          <CardHeader
            avatar={<TokenIcon color="primary" />}
            title="Generate Authentication Token"
            subheader="Enter your print server credentials"
          />
                     <CardContent>
             <Stack spacing={3}>
               <Stack direction="row" spacing={1} alignItems="end">
                 <TextField
                   label="Print Server URL"
                   type="url"
                   value={serverUrl}
                   onChange={(e) => setServerUrl(e.target.value)}
                   fullWidth
                   required
                   disabled={loading}
                   placeholder="https://192.168.1.100:5001"
                   helperText="Auto-detected from your current backend server"
                 />
                 <Button
                   variant="outlined"
                   onClick={() => setServerUrl(getServerUrl())}
                   disabled={loading}
                   sx={{ minWidth: 'auto', px: 2 }}
                 >
                   🔄
                 </Button>
               </Stack>
               
               <TextField
                 label="Email"
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 fullWidth
                 required
                 disabled={loading}
                 placeholder="admin@company.com"
               />
              
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
              />

                             <Alert severity="info">
                 <strong>Server:</strong> {serverUrl}<br />
                 <strong>SSL Verification:</strong> Disabled (recommended for IP-based servers)
               </Alert>

              <Stack direction="row" spacing={2}>
                                 <Button
                   variant="contained"
                   onClick={handleGenerateToken}
                   disabled={loading || !serverUrl || !email || !password}
                   startIcon={loading ? <CircularProgress size={20} /> : <TokenIcon />}
                   size="large"
                 >
                   {loading ? 'Generating...' : 'Generate Token'}
                 </Button>

                {tokenData && (
                  <Button
                    variant="outlined"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    New Token
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Token Results */}
        {tokenData && (
          <>
            {/* Token Information */}
            <Card>
              <CardHeader
                avatar={<CheckIcon color="success" />}
                title="Token Generated Successfully"
                subheader="Your authentication token is ready to use"
              />
              <CardContent>
                <Stack spacing={3}>
                  <Alert severity="success">
                    <Typography variant="subtitle2" gutterBottom>
                      Authentication Successful!
                    </Typography>
                    <Typography variant="body2">
                      Token has been generated and stored securely. Use the endpoints below to connect your print client.
                    </Typography>
                  </Alert>

                                     <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                     <Typography variant="h6" gutterBottom>
                       Token Details
                     </Typography>
                     <Stack spacing={2}>
                       <Typography variant="body2">
                         <strong>User:</strong> {tokenData.email} ({tokenData.role})
                       </Typography>
                       <Typography variant="body2">
                         <strong>Expires:</strong> {formatExpirationTime(tokenData.expiresAt)}
                       </Typography>
                       <Typography variant="body2">
                         <strong>Server:</strong> {tokenData.serverUrl}
                       </Typography>
                       
                       {/* Token Display with Copy Button */}
                       <Box>
                         <Typography variant="body2" sx={{ mb: 1 }}>
                           <strong>Authentication Token:</strong>
                         </Typography>
                         <Paper sx={{ 
                           p: 2, 
                           bgcolor: 'grey.900', 
                           color: 'white',
                           fontFamily: 'monospace',
                           position: 'relative',
                           wordBreak: 'break-all'
                         }}>
                           <Typography variant="body2" sx={{ pr: 6 }}>
                             {tokenData.token}
                           </Typography>
                           <Tooltip title={copiedItems.has('token') ? 'Copied!' : 'Copy Token'}>
                             <IconButton
                               size="small"
                               onClick={() => copyToClipboard(tokenData.token, 'token')}
                               sx={{ 
                                 position: 'absolute', 
                                 top: 8, 
                                 right: 8, 
                                 color: 'white',
                                 bgcolor: copiedItems.has('token') ? 'success.main' : 'rgba(255,255,255,0.2)'
                               }}
                             >
                               {copiedItems.has('token') ? <CheckIcon /> : <CopyIcon />}
                             </IconButton>
                           </Tooltip>
                         </Paper>
                         <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                           Copy this token to use in your print client's Authorization header
                         </Typography>
                       </Box>
                     </Stack>
                   </Paper>

                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Security Note:</strong> The token is stored securely and will be automatically included in API requests. 
                      Keep your credentials safe and regenerate tokens periodically.
                    </Typography>
                  </Alert>
                </Stack>
              </CardContent>
            </Card>

                         {/* Print Server URLs */}
             <Card>
               <CardHeader
                 title="📋 Print Client Configuration URLs"
                 subheader="Copy these URLs for manual print client setup"
               />
               <CardContent>
                 <Stack spacing={3}>
                                        <Alert severity="info">
                       <Typography variant="subtitle2" gutterBottom>
                         Print Client Configuration
                       </Typography>
                       <Typography variant="body2">
                         <strong>Setup:</strong> The token authenticates with your print server ({serverUrl})<br/>
                         <strong>URLs:</strong> Your print client should connect to the backend server (port 5001) at the URLs below
                       </Typography>
                     </Alert>

                                     <List>
                     {printEndpoints.map((endpoint, index) => (
                       <ListItem 
                         key={index} 
                         divider
                         sx={{ 
                           bgcolor: index < 2 ? 'error.50' : 'transparent',
                           borderLeft: index < 2 ? '4px solid' : 'none',
                           borderLeftColor: index < 2 ? 'error.main' : 'transparent',
                           '&:hover': { bgcolor: index < 2 ? 'error.100' : 'grey.50' }
                         }}
                       >
                         <ListItemIcon>
                           {endpoint.icon}
                         </ListItemIcon>
                         <ListItemText
                           primary={
                             <Stack direction="row" alignItems="center" spacing={1}>
                               <Typography variant="subtitle2" sx={{ fontWeight: index < 2 ? 700 : 500 }}>
                                 {endpoint.name}
                               </Typography>
                               <Chip
                                 label={endpoint.method}
                                 size="small"
                                 color={endpoint.method === 'POST' ? 'primary' : (index < 2 ? 'error' : 'default')}
                               />
                               {index < 2 && (
                                 <Chip
                                   label="REQUIRED"
                                   size="small"
                                   color="error"
                                   variant="outlined"
                                 />
                               )}
                             </Stack>
                           }
                           secondary={
                             <Stack spacing={1}>
                               <Typography 
                                 variant="body2" 
                                 color={index < 2 ? 'error.dark' : 'text.secondary'}
                                 sx={{ fontWeight: index < 2 ? 600 : 400 }}
                               >
                                 {endpoint.description}
                               </Typography>
                               <Box sx={{ 
                                 fontFamily: 'monospace', 
                                 bgcolor: index < 2 ? 'error.900' : 'grey.100', 
                                 color: index < 2 ? 'white' : 'black',
                                 p: 1.5, 
                                 borderRadius: 1,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'space-between',
                                 border: index < 2 ? '2px solid' : '1px solid',
                                 borderColor: index < 2 ? 'error.main' : 'grey.300'
                               }}>
                                 <Typography variant="body2" sx={{ wordBreak: 'break-all', fontWeight: index < 2 ? 600 : 400 }}>
                                   {endpoint.url}
                                 </Typography>
                                 <Tooltip title={copiedItems.has(endpoint.url) ? 'Copied!' : 'Copy URL'}>
                                   <IconButton
                                     size="small"
                                     onClick={() => copyToClipboard(endpoint.url, endpoint.url)}
                                     sx={{ 
                                       color: index < 2 ? 'white' : 'grey.700',
                                       bgcolor: copiedItems.has(endpoint.url) 
                                         ? (index < 2 ? 'success.light' : 'success.main') 
                                         : (index < 2 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                                       '&:hover': {
                                         bgcolor: copiedItems.has(endpoint.url) 
                                           ? (index < 2 ? 'success.main' : 'success.dark') 
                                           : (index < 2 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
                                       }
                                     }}
                                   >
                                     {copiedItems.has(endpoint.url) ? <CheckIcon /> : <CopyIcon />}
                                   </IconButton>
                                 </Tooltip>
                               </Box>
                             </Stack>
                           }
                         />
                       </ListItem>
                     ))}
                   </List>
                   
                   {/* Quick Copy All Section */}
                   <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                     <Typography variant="h6" gutterBottom color="primary">
                       🚀 Quick Setup for Your Print Client
                     </Typography>
                     <Stack spacing={2}>
                       <Button
                         variant="contained"
                         startIcon={<CopyIcon />}
                                                   onClick={() => copyToClipboard(`Authentication Token: ${tokenData.token}

QuickCheck App URLs (for your print client):
• Get Printers: ${backendServerUrl}/api/print/printers
• Submit Jobs: ${backendServerUrl}/api/print/jobs

Include this header in all requests:
Authorization: Bearer ${tokenData.token}`, 'Complete Setup Info')}
                         size="large"
                         color="primary"
                       >
                         Copy All Configuration
                       </Button>
                       <Typography variant="caption" color="text.secondary">
                         This copies the token and both required URLs for easy setup
                       </Typography>
                     </Stack>
                   </Paper>
                </Stack>
              </CardContent>
            </Card>

            {/* Usage Examples */}
            <Card>
              <CardHeader
                title="Integration Examples"
                subheader="Code examples for your print client"
              />
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant="h6">JavaScript Example</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', fontFamily: 'monospace' }}>
                    <Box sx={{ position: 'relative' }}>
                                             <Typography variant="body2" component="pre" sx={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`// Your print client connects to the backend server

fetch('${backendServerUrl}/api/print/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${tokenData?.token || 'YOUR_TOKEN_HERE'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    formName: 'labels', 
    jobData: {
      customerName: 'John Doe',
      vehicleInfo: '2023 Honda Civic'
    }
  })
});`}
                      </Typography>
                      <Tooltip title="Copy code">
                        <IconButton
                          sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
                                                     onClick={() => copyToClipboard(`fetch('${backendServerUrl}/api/print/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${tokenData?.token || 'YOUR_TOKEN_HERE'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    formName: 'labels',
    jobData: {
      customerName: 'John Doe',
      vehicleInfo: '2023 Honda Civic'
    }
  })
});`, 'JavaScript Code')}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>

                  <Divider />

                  <Typography variant="h6">cURL Example</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', fontFamily: 'monospace' }}>
                    <Box sx={{ position: 'relative' }}>
                                             <Typography variant="body2" component="pre" sx={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`curl -X POST ${backendServerUrl}/api/print/jobs \\
  -H "Authorization: Bearer ${tokenData?.token || 'YOUR_TOKEN'}" \\
  -H "Content-Type: application/json" \\
  -k \\
  -d '{
    "formName": "labels",
    "jobData": {
      "customerName": "John Doe", 
      "vehicleInfo": "2023 Honda Civic"
    }
  }'`}
                      </Typography>
                      <Tooltip title="Copy code">
                        <IconButton
                          sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
                                                     onClick={() => copyToClipboard(`curl -X POST ${backendServerUrl}/api/print/jobs \\
  -H "Authorization: Bearer ${tokenData?.token || 'YOUR_TOKEN'}" \\
  -H "Content-Type: application/json" \\
  -k \\
  -d '{
    "formName": "labels",
    "jobData": {
      "customerName": "John Doe",
      "vehicleInfo": "2023 Honda Civic"
    }
  }'`, 'cURL Code')}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Container>
  );
};

export default TokenGenerator; 