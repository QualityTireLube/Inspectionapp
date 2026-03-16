import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { onAuthChange } from '../services/firebase/auth';
import { firebaseInitError } from '../services/firebase/config';
import { useUser } from '../contexts/UserContext';
import { appPages } from '../pages/pageRegistry';
import { User } from 'firebase/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional page ID from pageRegistry.
   * If provided and the user's role does NOT include this page in visiblePages,
   * the user is redirected to their role's home page (or "/" as fallback).
   */
  pageId?: string;
}

// If Firebase auth hasn't resolved after this many ms, assume logged out.
const AUTH_TIMEOUT_MS = 8000;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, pageId }) => {
  const location = useLocation();
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [timedOut, setTimedOut] = useState(false);
  const { visiblePages, roleHomePageId, loading: userLoading } = useUser();

  if (firebaseInitError) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setFirebaseUser(user);
    });
    const timer = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (firebaseUser === undefined && !timedOut) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based page access check
  if (pageId && !userLoading && visiblePages.length > 0 && !visiblePages.includes(pageId)) {
    const homePage = roleHomePageId ? appPages.find(p => p.id === roleHomePageId) : null;
    return <Navigate to={homePage?.path ?? '/'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
