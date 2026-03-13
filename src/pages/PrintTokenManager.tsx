import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
  VpnKey as VpnKeyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import PrintClientTokenService from '../services/printClientTokens';
import { useNotification } from '../hooks/useNotification';
import type { PrintClientToken, CreateTokenRequest } from '../services/printClientTokens';
import { useUser } from '../contexts/UserContext';

const PrintTokenManager: React.FC = () => {
  const [tokens, setTokens] = useState<PrintClientToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { showNotification } = useNotification();
  const { user } = useUser();

  const [createForm, setCreateForm] = useState<CreateTokenRequest>({
    name: '',
    serverUrl: '',
    email: '',
    password: ''
  });
  const [generatedToken, setGeneratedToken] = useState<string>('');

  useEffect(() => {
    fetchTokens();
    // Initialize form with defaults
    const hostname = window.location.hostname;
    // Production: use api.autoflopro.com subdomain
    const url = (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com')
      ? 'https://api.autoflopro.com'
      : `https://${hostname}:5001`;
    setCreateForm(prev => ({
      ...prev,
      serverUrl: url,
      email: user?.email || localStorage.getItem('userEmail') || ''
    }));
  }, [user?.email]);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const tokenList = await PrintClientTokenService.getTokens();
      setTokens(tokenList);
    } catch (error) {
      console.error('Error loading tokens:', error);
      showNotification('Failed to load tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!createForm.name.trim()) {
      showNotification('Token name is required', 'error');
      return;
    }
    if (!createForm.email.trim()) {
      showNotification('Email is required', 'error');
      return;
    }
    if (!createForm.password) {
      showNotification('Password is required', 'error');
      return;
    }

    setCreating(true);
    try {
      const result = await PrintClientTokenService.createToken(createForm);
      setGeneratedToken(result.token);
      showNotification('Token created successfully!', 'success');
      fetchTokens(); // Refresh the list
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create token';
      showNotification(`Failed to create token: ${errorMessage}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDisableToken = async (tokenId: string) => {
    try {
      await PrintClientTokenService.disableToken(tokenId);
      showNotification('Token disabled successfully', 'success');
      fetchTokens();
    } catch (error) {
      console.error('Error disabling token:', error);
      showNotification('Failed to disable token', 'error');
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (window.confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      try {
        await PrintClientTokenService.deleteToken(tokenId);
        showNotification('Token deleted successfully', 'success');
        fetchTokens();
      } catch (error) {
        console.error('Error deleting token:', error);
        showNotification('Failed to delete token', 'error');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard', 'success');
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
    setGeneratedToken('');
    setCreateForm(prev => ({
      ...prev,
      name: 'Print Client Token',
      password: ''
    }));
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setGeneratedToken('');
    setCreateForm(prev => ({
      ...prev,
      name: '',
      password: ''
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Print Client Token Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={fetchTokens} color="primary">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
            >
              Create Token
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage permanent authentication tokens for print clients. These tokens allow print clients to connect to the server without requiring user login.
        </Typography>

        {tokens.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No permanent tokens found. Create your first token to enable print client authentication.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VpnKeyIcon color="primary" fontSize="small" />
                        {token.name}
                      </Box>
                    </TableCell>
                    <TableCell>{token.created_by_name}</TableCell>
                    <TableCell>
                      {new Date(token.created_at).toLocaleDateString()} {new Date(token.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      {token.last_used ? (
                        <>
                          {new Date(token.last_used).toLocaleDateString()} {new Date(token.last_used).toLocaleTimeString()}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Never</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={token.enabled ? 'Active' : 'Disabled'} 
                        color={token.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {token.enabled && (
                          <Button 
                            size="small" 
                            onClick={() => handleDisableToken(token.id)}
                            color="warning"
                            variant="outlined"
                          >
                            Disable
                          </Button>
                        )}
                        <IconButton
                          onClick={() => handleDeleteToken(token.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create Token Dialog */}
      <Dialog open={createDialogOpen} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Print Client Token</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Create a permanent authentication token for a print client. This token will allow the client to connect without requiring user login.
            </Alert>
            
            <TextField
              label="Token Name"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Main Office Printer Token"
              fullWidth
              required
            />
            
            <TextField
              label="Server URL"
              value={createForm.serverUrl}
              onChange={(e) => setCreateForm(prev => ({ ...prev, serverUrl: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
              fullWidth
              required
            />

            {generatedToken && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="success.main">
                  Token created successfully!
                </Typography>
                <TextField
                  label="Generated Token"
                  value={generatedToken}
                  multiline
                  rows={3}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    startIcon={<CopyIcon />} 
                    onClick={() => copyToClipboard(generatedToken)}
                    variant="outlined"
                  >
                    Copy Token
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<CopyIcon />} 
                    onClick={() => copyToClipboard(createForm.serverUrl)}
                    variant="outlined"
                  >
                    Copy Server URL
                  </Button>
                </Box>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateDialog}>
            {generatedToken ? 'Close' : 'Cancel'}
          </Button>
          {!generatedToken && (
            <Button 
              variant="contained" 
              onClick={handleCreateToken} 
              disabled={creating || !createForm.name.trim() || !createForm.email.trim() || !createForm.password}
            >
              {creating ? 'Creating...' : 'Create Token'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PrintTokenManager;
