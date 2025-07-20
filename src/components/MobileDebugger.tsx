import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface DebugInfo {
  browser: string;
  userAgent: string;
  platform: string;
  localStorage: boolean;
  sessionStorage: boolean;
  cookiesEnabled: boolean;
  online: boolean;
  language: string;
  screen: string;
  storage: any;
  apiUrl: string;
  currentUrl: string;
}

interface MobileDebuggerProps {
  open: boolean;
  onClose: () => void;
  lastError?: any;
  lastEmailInput?: string;
}

const MobileDebugger: React.FC<MobileDebuggerProps> = ({ 
  open, 
  onClose, 
  lastError, 
  lastEmailInput 
}) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState('');

  const collectDebugInfo = (): DebugInfo => {
    // Test storage
    let localStorage = false;
    let sessionStorage = false;
    let cookiesEnabled = false;
    let storageData: any = {};

    try {
      window.localStorage.setItem('__debug_test__', 'test');
      window.localStorage.removeItem('__debug_test__');
      localStorage = true;
      
      // Try to get existing storage data
      storageData.token = window.localStorage.getItem('token');
      storageData.userEmail = window.localStorage.getItem('userEmail');
      storageData.userName = window.localStorage.getItem('userName');
    } catch (e) {
      console.warn('localStorage test failed:', e);
    }

    try {
      window.sessionStorage.setItem('__debug_test__', 'test');
      window.sessionStorage.removeItem('__debug_test__');
      sessionStorage = true;
    } catch (e) {
      console.warn('sessionStorage test failed:', e);
    }

    try {
      document.cookie = '__debug_test__=test';
      cookiesEnabled = document.cookie.includes('__debug_test__=test');
      if (cookiesEnabled) {
        document.cookie = '__debug_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    } catch (e) {
      console.warn('cookies test failed:', e);
    }

    // Detect browser
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = ua.includes('iPhone') || ua.includes('iPad') ? 'Safari iOS' : 'Safari Desktop';
    } else if (ua.includes('Chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
    }

    // Get API URL with HTTPS enforcement
    const protocol = 'https'; // Always use HTTPS
    const hostname = window.location.hostname;
    const port = import.meta.env.DEV ? '5001' : '5001';
    const apiUrl = `${protocol}://${hostname}:${port}/api`;

    return {
      browser,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      localStorage,
      sessionStorage,
      cookiesEnabled,
      online: navigator.onLine,
      language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
      storage: storageData,
      apiUrl,
      currentUrl: window.location.href
    };
  };

  useEffect(() => {
    if (open) {
      const info = collectDebugInfo();
      setDebugInfo(info);
      console.log('🔍 Mobile Debug Info:', info);
    }
  }, [open]);

  const testApiConnection = async () => {
    if (!debugInfo) return;
    
    // Check for mixed content first
    const frontendProtocol = window.location.protocol;
    const apiProtocol = debugInfo.apiUrl.startsWith('https') ? 'https:' : 'http:';
    
    if (frontendProtocol === 'https:' && apiProtocol === 'http:') {
      alert('🚨 MIXED CONTENT DETECTED!\n\nHTTPS page cannot call HTTP API.\nBackend must use HTTPS.');
      return;
    }
    
    try {
      // Test the health endpoint
      const response = await fetch(`${debugInfo.apiUrl}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ HTTPS API Connection: SUCCESS\n\nStatus: ${data.status}\nMessage: ${data.message}\nProtocol: ${data.protocol}\nSecure: ${data.secure}`);
      } else {
        alert(`❌ API Connection: FAILED (${response.status})\n\nHealth endpoint returned an error.`);
      }
    } catch (error: any) {
      if (error.message.includes('Load failed')) {
        const baseUrl = debugInfo.apiUrl.replace('/api', '');
        setCertificateUrl(baseUrl);
        setCertificateDialogOpen(true);
      } else {
        alert(`❌ API Connection: ERROR (${error.message})`);
      }
    }
  };

  const testLogin = async () => {
    if (!debugInfo || !lastEmailInput) return;
    
    // Check for mixed content first
    const frontendProtocol = window.location.protocol;
    const apiProtocol = debugInfo.apiUrl.startsWith('https') ? 'https:' : 'http:';
    
    if (frontendProtocol === 'https:' && apiProtocol === 'http:') {
      alert('🚨 MIXED CONTENT: Cannot test login\nHTTPS page cannot call HTTP API');
      return;
    }
    
    try {
      const normalizedEmail = lastEmailInput.toLowerCase().trim();
      
      const response = await fetch(`${debugInfo.apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: normalizedEmail,
          password: 'test123' // Using a test password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Test Login: SUCCESS\nToken: ${data.token ? 'Present' : 'Missing'}`);
      } else {
        alert(`❌ Test Login: FAILED\nError: ${data.error || 'Unknown error'}\nStatus: ${response.status}`);
      }
    } catch (error: any) {
      alert(`❌ Test Login: ERROR\n${error.message}`);
    }
  };

  const clearAllStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      alert('✅ All storage cleared');
    } catch (error) {
      alert(`❌ Failed to clear storage: ${error}`);
    }
  };

  if (!debugInfo) return null;

  // Check for mixed content
  const frontendProtocol = window.location.protocol;
  const apiProtocol = debugInfo.apiUrl.startsWith('https') ? 'https:' : 'http:';
  const hasMixedContent = frontendProtocol === 'https:' && apiProtocol === 'http:';

  return (
    <>
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen 
      sx={{ 
        '& .MuiDialog-paper': { 
          backgroundColor: '#f5f5f5',
          padding: 0
        } 
      }}
    >
      <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white', mb: 2 }}>
        🔍 Safari HTTPS Debug Console
      </DialogTitle>
      
      <DialogContent sx={{ padding: 2 }}>
        {/* Critical Issues Alert */}
        {hasMixedContent && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">🚨 CRITICAL: Mixed Content Detected</Typography>
            <Typography variant="body2">
              HTTPS page cannot call HTTP API. This will block all API requests in Safari.
              Backend server must use HTTPS.
            </Typography>
          </Alert>
        )}

        {(!debugInfo.localStorage && !debugInfo.sessionStorage) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">🚨 CRITICAL: Storage Blocked</Typography>
            <Typography variant="body2">
              Both localStorage and sessionStorage are blocked. This will prevent login from working.
              Are you in Private Browsing mode?
            </Typography>
          </Alert>
        )}

        {debugInfo.browser.includes('Safari') && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6">🦄 Safari Detected</Typography>
            <Typography variant="body2">
              Safari has stricter HTTPS security policies. Check the debug info below.
            </Typography>
          </Alert>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">🌐 Browser Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 2, backgroundColor: '#fff' }}>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
{`Browser: ${debugInfo.browser}
Platform: ${debugInfo.platform}
Online: ${debugInfo.online ? '✅' : '❌'}
Language: ${debugInfo.language}
Screen: ${debugInfo.screen}
User Agent: ${debugInfo.userAgent}`}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">🔒 HTTPS Status</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 2, backgroundColor: hasMixedContent ? '#ffebee' : '#e8f5e8' }}>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
{`Frontend Protocol: ${frontendProtocol}
API Protocol: ${apiProtocol}
Mixed Content: ${hasMixedContent ? '❌ DETECTED' : '✅ None'}

${hasMixedContent ? '🚨 HTTPS page cannot call HTTP API' : '✅ Protocol compatibility OK'}`}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">💾 Storage Status</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 2, backgroundColor: '#fff' }}>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
{`localStorage: ${debugInfo.localStorage ? '✅ Available' : '❌ Blocked'}
sessionStorage: ${debugInfo.sessionStorage ? '✅ Available' : '❌ Blocked'}
Cookies: ${debugInfo.cookiesEnabled ? '✅ Enabled' : '❌ Disabled'}

Current Storage:
- Token: ${debugInfo.storage.token ? 'Present' : 'Missing'}
- Email: ${debugInfo.storage.userEmail || 'Missing'}
- Name: ${debugInfo.storage.userName || 'Missing'}`}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">🌍 Network Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 2, backgroundColor: '#fff' }}>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
{`Current URL: ${debugInfo.currentUrl}
API URL: ${debugInfo.apiUrl}
Protocol: ${window.location.protocol}
Host: ${window.location.host}`}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>

        {lastError && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">❌ Last Error</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2, backgroundColor: '#ffebee' }}>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
{`Error Message: ${lastError.message || 'Unknown'}
Status: ${lastError.status || 'No status'}
Code: ${lastError.code || 'No code'}
Response: ${JSON.stringify(lastError.response?.data, null, 2) || 'No response'}`}
                </Typography>
              </Paper>
            </AccordionDetails>
          </Accordion>
        )}

        {lastEmailInput && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">📧 Email Analysis</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2, backgroundColor: '#fff' }}>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
{`Original: "${lastEmailInput}"
Normalized: "${lastEmailInput.toLowerCase().trim()}"
Length: ${lastEmailInput.length}
Has spaces: ${lastEmailInput.includes(' ') ? '⚠️ Yes' : '✅ No'}
Has caps: ${lastEmailInput !== lastEmailInput.toLowerCase() ? '⚠️ Yes' : '✅ No'}`}
                </Typography>
              </Paper>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={testApiConnection}
            disabled={hasMixedContent}
            sx={{ fontSize: '1.1rem', py: 1.5 }}
          >
            🔗 Test HTTPS API Connection
          </Button>
          
          {lastEmailInput && (
            <Button 
              variant="contained" 
              color="secondary"
              onClick={testLogin}
              disabled={hasMixedContent}
              sx={{ fontSize: '1.1rem', py: 1.5 }}
            >
              🧪 Test Login API
            </Button>
          )}
          
          {hasMixedContent && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                API tests disabled due to mixed content. Backend must use HTTPS.
              </Typography>
            </Alert>
          )}
          
          <Button 
            variant="outlined" 
            color="warning"
            onClick={clearAllStorage}
            sx={{ fontSize: '1.1rem', py: 1.5 }}
          >
            🧹 Clear All Storage
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          size="large"
          sx={{ minWidth: 120, fontSize: '1.1rem' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>

    {/* Certificate Dialog */}
    <Dialog
      open={certificateDialogOpen}
      onClose={() => setCertificateDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ backgroundColor: '#f44336', color: 'white' }}>
        🔒 Certificate Issue
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Certificate Not Accepted</Typography>
          <Typography variant="body2">
            The HTTPS certificate needs to be accepted before the API can work.
          </Typography>
        </Alert>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          You need to visit the API server URL and accept the security certificate:
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
        
        <Typography variant="body2" color="text.secondary">
          Tap the link above, then:
          <br />• Tap "Advanced" on the security warning
          <br />• Tap "Continue to [IP address] (unsafe)"
          <br />• Come back and try logging in again
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          href={certificateUrl}
          target="_blank"
          variant="contained"
          color="primary"
          size="large"
          sx={{ mr: 1 }}
        >
          🔗 Open Certificate Page
        </Button>
        <Button 
          onClick={() => setCertificateDialogOpen(false)}
          variant="outlined"
          size="large"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default MobileDebugger; 