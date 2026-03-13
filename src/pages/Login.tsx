import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { login } from '../services/api';
import { setAuthToken, startExpiryWatcher, clearAllAuthStorage, getToken } from '../auth';
import { showSafariAlert, detectBrowser, testStorage } from '../services/safariDebug';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState('');
  const [expiredMessage, setExpiredMessage] = useState('');
  const [storageClearedBanner, setStorageClearedBanner] = useState(false);
  const [isCertificateApprovalFlow, setIsCertificateApprovalFlow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get the return URL from location state, or default to '/'
  const from = (location.state as any)?.from?.pathname || '/';

  // Check for expired session parameter
  useEffect(() => {
    const expired = searchParams.get('expired');
    if (expired === 'true') {
      // Only show the expired message if we actually had a token prior to clearing
      const hadToken = !!getToken();

      // Trigger the same behavior as Safari HTTPS Debug Console → "Clear All Storage"
      // 1) Clear auth-related keys (safe, shared util)
      try { clearAllAuthStorage(); } catch {}
      // 2) Mirror the Debug Console's full clear for Safari cache oddities
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      // 3) Show confirmation banner and optional Safari visual alert
      setStorageClearedBanner(true);
      try { showSafariAlert('All web storage has been cleared due to an expired session.'); } catch {}

      // Set/hide the expired message based on whether a token existed
      if (hadToken) {
        setExpiredMessage('Your session has expired. Please log in again.');
      } else {
        setExpiredMessage('');
      }
    }
  }, [searchParams]);

  // Auto-hide the storage cleared banner after 2 seconds
  useEffect(() => {
    if (!storageClearedBanner) return;
    const timer = window.setTimeout(() => setStorageClearedBanner(false), 2000);
    return () => window.clearTimeout(timer);
  }, [storageClearedBanner]);

  // Clear stale auth state on mount to avoid stale expired tokens on Safari/iOS
  useEffect(() => {
    try { clearAllAuthStorage(); } catch {}
  }, []);

  // Safari-compatible localStorage with extensive logging
  const safariSetItem = (key: string, value: string) => {
    console.log(`🔧 Attempting to store ${key}...`);
    try {
      localStorage.setItem(key, value);
      console.log(`✅ localStorage.setItem(${key}) - SUCCESS`);
    } catch (e) {
      console.warn(`❌ localStorage.setItem(${key}) - FAILED:`, e);
      try {
        sessionStorage.setItem(key, value);
        console.log(`✅ sessionStorage.setItem(${key}) - SUCCESS (fallback)`);
        showSafariAlert(`Using sessionStorage fallback for ${key}`);
      } catch (sessionError) {
        console.error(`❌ sessionStorage.setItem(${key}) - FAILED:`, sessionError);
        showSafariAlert(`❌ Storage completely blocked! Login may not persist.`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const { token, email: responseEmail, name, role, userId, expiresIn } = await login(normalizedEmail, password);
      
      setAuthToken(token, expiresIn);
      startExpiryWatcher();
      safariSetItem('userName', name);
      safariSetItem('userEmail', responseEmail);
      safariSetItem('userRole', role);
      safariSetItem('userId', userId);
      
      setIsCertificateApprovalFlow(false);
      navigate(from, { replace: true });
      
    } catch (err: any) {
      clearAllAuthStorage();

      let errorMessage = 'Invalid email or password';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
        console.log('Server error message:', errorMessage);
      } else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        console.log('Network error detected');
        
        // Check if this might be a certificate issue
        if (err.message.includes('Load failed') || err.message.includes('NetworkError')) {
          const getApiUrl = () => {
            const hostname = window.location.hostname;
            // Production: use api.autoflopro.com subdomain
            if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
              return 'https://api.autoflopro.com';
            }
            return `https://${hostname}:5001`;
          };
          const baseUrl = getApiUrl();
          setCertificateUrl(baseUrl);
          setCertificateDialogOpen(true);
        }
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.';
        console.log('Timeout error detected');
      }
      
      setError(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalValue = e.target.value;
    // Prevent Safari's auto-capitalization and auto-correction
    const value = originalValue.toLowerCase().trim();
    console.log(`📝 Email input: "${originalValue}" → "${value}"`);
    setEmail(value);
  };

  // Custom testApiOnly with dialog support
  const testApiOnly = async () => {
    const getApiUrl = () => {
      const hostname = window.location.hostname;
      // Production: use api.autoflopro.com subdomain
      if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
        return 'https://api.autoflopro.com/api';
      }
      return `https://${hostname}:5001/api`;
    };

    const apiUrl = getApiUrl();
    
    // Check for mixed content first
    const frontendProtocol = window.location.protocol;
    const apiProtocol = apiUrl.startsWith('https') ? 'https:' : 'http:';
    
    if (frontendProtocol === 'https:' && apiProtocol === 'http:') {
      alert('🚨 MIXED CONTENT DETECTED!\n\nHTTPS page cannot call HTTP API.\n\nThe backend server must use HTTPS.');
      return;
    }
    
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ HTTPS API Connection: SUCCESS\n\nServer Status: ${data.status}\nMessage: ${data.message}\nProtocol: ${data.protocol}\nSecure: ${data.secure}`);
      } else {
        alert(`❌ HTTPS API Connection: FAILED\nStatus: ${response.status}\n\nThe server responded but the health endpoint returned an error.`);
      }
    } catch (error: any) {
      if (error.message.includes('Load failed') || error.message.includes('NetworkError')) {
        const baseUrl = apiUrl.replace('/api', '');
        setCertificateUrl(baseUrl);
        setCertificateDialogOpen(true);
      } else {
        alert(`❌ HTTPS API Connection: ERROR\n${error.message}\n\nCheck:\n- Server running on HTTPS?\n- Same network?\n- Certificate valid?`);
      }
    }
  };

  // Handle "Go to the site anyway" action for certificate approval
  const handleGoToSiteAnyway = () => {
    setIsCertificateApprovalFlow(true);
    setCertificateDialogOpen(false);
    
    // Open the backend URL in a new tab/window
    const backendUrl = certificateUrl;
    const newWindow = window.open(backendUrl, '_blank');
    
    if (newWindow) {
      // Show a message to the user
      alert('🔒 Certificate Approval Required\n\nA new tab has opened with the backend server.\n\nPlease:\n1. Click "Advanced" on the security warning\n2. Click "Continue to [IP address] (unsafe)"\n3. Close that tab and return here\n4. Try logging in again');
      
      // Focus back to the current window after a short delay
      setTimeout(() => {
        window.focus();
      }, 1000);
    } else {
      // If popup was blocked, show instructions
      alert('🔒 Popup Blocked\n\nPlease manually navigate to:\n' + backendUrl + '\n\nThen:\n1. Click "Advanced" on the security warning\n2. Click "Continue to [IP address] (unsafe)"\n3. Return here and try logging in again');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to your account to continue
            </Typography>
          </Box>

          {/* Expired Session Message */}
          {expiredMessage && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {expiredMessage}
            </Alert>
          )}

          {/* Storage Cleared Banner (after expired session) */}
          {storageClearedBanner && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Cleared all storage to prevent stale session data. Please log in again.
            </Alert>
          )}

          {/* Certificate Approval Flow Indicator */}
          {isCertificateApprovalFlow && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Certificate Approval in Progress</strong>
                <br />
                Please complete the certificate approval in the new tab, then return here to log in.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setIsCertificateApprovalFlow(false)}
                sx={{ mt: 1 }}
              >
                I've completed the approval
              </Button>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              margin="normal"
              required
              autoFocus
              // Safari-specific attributes
              inputProps={{
                autoComplete: "email",
                autoCapitalize: "none",
                autoCorrect: "off",
                spellCheck: "false"
              }}
              // Additional Safari input handling
              onBlur={(e) => {
                // Ensure email is normalized on blur
                const normalizedEmail = e.target.value.toLowerCase().trim();
                console.log(`👁️ Email blur: "${e.target.value}" → "${normalizedEmail}"`);
                if (normalizedEmail !== email) {
                  setEmail(normalizedEmail);
                }
              }}
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              // Safari-specific attributes
              inputProps={{
                autoComplete: "current-password",
                autoCapitalize: "none",
                autoCorrect: "off",
                spellCheck: "false"
              }}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Sign up here
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
      
      {/* Certificate Dialog */}
      <Dialog
        open={certificateDialogOpen}
        onClose={() => setCertificateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f44336', color: 'white' }}>
          🔒 HTTPS Security Issue
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Certificate Not Trusted</Typography>
            <Typography variant="body2">
              The backend server's HTTPS certificate needs to be accepted before you can log in.
            </Typography>
          </Alert>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            This is a development server with a self-signed certificate. You need to approve it:
          </Typography>
          
          <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2 }}>
            <Typography 
              variant="h6" 
              component="a" 
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: '#1976d2',
                textDecoration: 'underline',
                wordBreak: 'break-all',
                display: 'block'
              }}
            >
              {certificateUrl}
            </Typography>
          </Paper>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Steps to approve:</strong>
            <br />1. Click "Go to the site anyway" below
            <br />2. Click "Advanced" on the security warning
            <br />3. Click "Continue to [IP address] (unsafe)"
            <br />4. Return here and try logging in again
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleGoToSiteAnyway}
            variant="contained"
            color="primary"
            size="large"
            sx={{ mr: 1 }}
          >
            🔗 Go to the site anyway
          </Button>
          <Button 
            onClick={() => setCertificateDialogOpen(false)}
            variant="outlined"
            size="large"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      </Container>
    );
  };

export default Login; 