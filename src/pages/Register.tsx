import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Fab,
  Collapse,
  Card,
  CardContent
} from '@mui/material';
import { register } from '../services/api';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const navigate = useNavigate();

  const collectDebugInfo = () => {
    return {
      browser: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenSize: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      protocol: window.location.protocol,
      host: window.location.host,
      currentTime: new Date().toISOString(),
      formData: {
        nameLength: name.length,
        emailFormat: email.includes('@') ? 'Valid' : 'Invalid',
        passwordLength: password.length,
        pinLength: pin.length,
        pinIsNumeric: /^\d+$/.test(pin)
      },
      storage: {
        localStorage: (() => {
          try {
            localStorage.setItem('__test__', 'test');
            localStorage.removeItem('__test__');
            return 'Available';
          } catch (e) {
            return 'Blocked';
          }
        })(),
        sessionStorage: (() => {
          try {
            sessionStorage.setItem('__test__', 'test');
            sessionStorage.removeItem('__test__');
            return 'Available';
          } catch (e) {
            return 'Blocked';
          }
        })()
      }
    };
  };

  const toggleDebugMode = () => {
    if (!debugMode) {
      setDebugInfo(collectDebugInfo());
    }
    setDebugMode(!debugMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate fields before submission
    if (!email || !password || !name || !pin) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting registration with:', { email, name, pin, password: '[REDACTED]' });
      await register(email, password, name, pin);
      navigate('/login');
    } catch (err: any) {
      console.error('Registration error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create a new account to get started
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              autoComplete="name"
              autoFocus
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="email"
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="new-password"
            />

            <TextField
              fullWidth
              label="4-Digit PIN"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(value);
              }}
              margin="normal"
              required
              inputProps={{
                maxLength: 4,
                pattern: '[0-9]*',
                inputMode: 'numeric',
                style: { textAlign: 'center', fontSize: '1.2em', letterSpacing: '0.5em' }
              }}
              helperText="Choose a unique 4-digit PIN for quick identification on shared computers"
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
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
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
                    Sign in here
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>

      {/* Debug Toggle Circle */}
      <Fab
        size="small"
        onClick={toggleDebugMode}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          backgroundColor: debugMode ? '#4caf50' : '#c0c0c0',
          color: debugMode ? 'white' : '#666',
          width: 40,
          height: 40,
          minHeight: 40,
          '&:hover': {
            backgroundColor: debugMode ? '#45a049' : '#b0b0b0'
          },
          fontSize: '0.8rem',
          zIndex: 1000
        }}
      >
        🔍
      </Fab>

      {/* Debug Information Display */}
      <Collapse in={debugMode}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            maxWidth: 350,
            maxHeight: '60vh',
            overflow: 'auto',
            zIndex: 999
          }}
        >
          <Card elevation={6}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
                🔍 Debug Information
              </Typography>
              
              {debugInfo && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1, fontSize: '0.9rem' }}>
                    🌐 Browser Info
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    Platform: {debugInfo.platform}<br />
                    Language: {debugInfo.language}<br />
                    Online: {debugInfo.onLine ? '✅' : '❌'}<br />
                    Cookies: {debugInfo.cookiesEnabled ? '✅' : '❌'}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontSize: '0.9rem' }}>
                    📱 Display Info
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    Screen: {debugInfo.screenSize}<br />
                    Viewport: {debugInfo.viewportSize}<br />
                    Protocol: {debugInfo.protocol}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontSize: '0.9rem' }}>
                    💾 Storage
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    localStorage: {debugInfo.storage.localStorage}<br />
                    sessionStorage: {debugInfo.storage.sessionStorage}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontSize: '0.9rem' }}>
                    📝 Form Data
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    Name: {debugInfo.formData.nameLength} chars<br />
                    Email: {debugInfo.formData.emailFormat}<br />
                    Password: {debugInfo.formData.passwordLength} chars<br />
                    PIN: {debugInfo.formData.pinLength} chars ({debugInfo.formData.pinIsNumeric ? 'numeric' : 'invalid'})
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontSize: '0.9rem' }}>
                    🕒 Timestamp
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {debugInfo.currentTime}
                  </Typography>
                </Box>
              )}
              
              <Button
                onClick={() => setDebugMode(false)}
                size="small"
                variant="outlined"
                fullWidth
                sx={{ mt: 2, fontSize: '0.75rem' }}
              >
                Close Debug
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Collapse>
    </Container>
  );
};

export default Register; 