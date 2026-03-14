import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
   * the user is redirected to their role home path. Admin role always bypasses.
   */
  pageId?: string;
}

// If Firebase auth hasn't resolved after this many ms, assume logged out.
const AUTH_TIMEOUT_MS = 8000;

const Spinner = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">Loading…</Typography>
  </Box>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, pageId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // undefined = still checking, null = not logged in, User = logged in
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [timedOut, setTimedOut] = useState(false);
  const { user, allowedPageIds, roleHomePath, loading: userLoading } = useUser();

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

  // RBAC redirect — imperative so it fires exactly once when access is determined,
  // not on every re-render caused by UserContext state updates.
  // Using <Navigate> declaratively here would call history.replaceState on every
  // context re-render, which triggers Chrome's navigation throttle warning.
  const isAccessDenied =
    !!pageId &&
    !userLoading &&
    !!user &&
    user.role !== 'admin' &&
    allowedPageIds !== null &&
    !allowedPageIds.includes(pageId);

  useEffect(() => {
    if (!isAccessDenied) return;
    const destination = roleHomePath !== location.pathname ? roleHomePath : '/quick-check';
    navigate(destination, { replace: true });
  }, [isAccessDenied, roleHomePath, location.pathname, navigate]);

  // Still resolving Firebase auth state
  if (firebaseUser === undefined && !timedOut) {
    return <Spinner />;
  }

  // Not authenticated
  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for user profile + role permissions to finish loading before access check
  if (pageId && userLoading) {
    return <Spinner />;
  }

  // Return null while the imperative RBAC redirect is in flight (prevents content flash
  // and avoids rendering children for a page the user cannot access)
  if (isAccessDenied) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
