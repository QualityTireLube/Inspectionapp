import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Auth bypassed — restore from ProtectedRoute.ORIGINAL.tsx to re-enable login
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <>{children}</>;
};

export default ProtectedRoute; 