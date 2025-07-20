import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getItem } from '../services/safariStorage';
import tokenManager from '../services/tokenManager';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = getItem('token');
  
  if (!token) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if token is expired
  if (tokenManager.isTokenExpired(token)) {
    console.log('🔐 Token expired in ProtectedRoute - redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute; 