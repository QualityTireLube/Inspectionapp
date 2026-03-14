import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { onAuthChange } from '../services/firebase/auth';
import { firebaseInitError } from '../services/firebase/config';
import { User } from 'firebase/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// If Firebase auth hasn't resolved after this many ms, assume logged out.
const AUTH_TIMEOUT_MS = 8000;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  // undefined = still checking, null = not logged in, User = logged in
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [timedOut, setTimedOut] = useState(false);

  // If Firebase failed to initialise entirely, go straight to login.
  if (firebaseInitError) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setFirebaseUser(user);
    });

    // Safety net: if auth state never fires, send to login after timeout.
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

  return <>{children}</>;
};

export default ProtectedRoute;
