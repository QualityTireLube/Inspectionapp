import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, isTokenExpired } from '../auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = getToken();
  
  if (!token) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if token is expired using robust logic that supports non-JWT tokens
  if (isTokenExpired(token)) {
    console.log('🔐 Token expired in ProtectedRoute - redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute; 