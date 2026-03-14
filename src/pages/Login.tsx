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
} from '@mui/material';
import { loginUser } from '../services/firebase/auth';
import { clearAllAuthStorage, getToken } from '../auth';
import { showSafariAlert } from '../services/safariDebug';
import { appPages } from '../pages/pageRegistry';

// Build the set of valid app paths from the central registry so we never
// navigate post-login to a stale, bookmarked, or externally-linked URL that
// doesn't exist in React Router (e.g. /home/ from an old link → 404 on Amplify).
const VALID_PATHS = new Set(appPages.map(p => p.path.split('?')[0]));
VALID_PATHS.add('/profile');
VALID_PATHS.add('/register');

function isValidReturnPath(path: string): boolean {
  if (!path || path === '/login' || path === '/register') return false;
  // Exact match against known routes
  if (VALID_PATHS.has(path)) return true;
  // Allow dynamic detail routes like /quick-check/abc123
  if (path.startsWith('/quick-check/')) return true;
  return false;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState('');
  const [storageClearedBanner, setStorageClearedBanner] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Validate the return URL so stale/cached paths (e.g. /home/ from old bookmarks)
  // don't cause a 404 or redirect loop after login.
  const rawFrom: string = (location.state as any)?.from?.pathname || '/';
  const from = isValidReturnPath(rawFrom) ? rawFrom : '/';

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

  // Clear legacy JWT storage on mount — Firebase manages its own session
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
      const userCredential = await loginUser(normalizedEmail, password);
      const firebaseUser = userCredential.user;

      safariSetItem('userName', firebaseUser.displayName || normalizedEmail);
      safariSetItem('userEmail', firebaseUser.email || normalizedEmail);
      safariSetItem('userId', firebaseUser.uid);

      navigate(from, { replace: true });
      
    } catch (err: any) {
      let errorMessage = 'Invalid email or password';

      // Map Firebase Auth error codes to user-friendly messages
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
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
      
      </Container>
    );
  };

export default Login; 