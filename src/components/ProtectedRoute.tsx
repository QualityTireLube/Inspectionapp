import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { onAuthChange } from '../services/firebase/auth';
import { firebaseInitError } from '../services/firebase/config';
import { useUser } from '../contexts/UserContext';
import { User } from 'firebase/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * The page ID from pageRegistry. When provided, the user's role-based
   * page permissions are checked. If the role doesn't include this page ID,
   * the user is redirected to /. Admin role always bypasses this check.
   */
  pageId?: string;
}

// If Firebase auth hasn't resolved after this many ms, assume logged out.
const AUTH_TIMEOUT_MS = 8000;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, pageId }) => {
  const location = useLocation();
  // undefined = still checking, null = not logged in, User = logged in
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [timedOut, setTimedOut] = useState(false);
  const { user, allowedPageIds, loading: userLoading } = useUser();

  // If Firebase failed to initialise entirely, go straight to login.
  if (firebaseInitError) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setFirebaseUser(u);
    });

    // Safety net: if auth state never fires, send to login after timeout.
    const timer = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Still resolving Firebase auth state
  if (firebaseUser === undefined && !timedOut) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  // Not authenticated
  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for user profile + role permissions to load before checking page access
  if (pageId && userLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  // Role-based page access check.
  // Admins always have full access. Other roles are checked against allowedPageIds.
  if (pageId && user && user.role !== 'admin' && allowedPageIds !== null) {
    if (!allowedPageIds.includes(pageId)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
