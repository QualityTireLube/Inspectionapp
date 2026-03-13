import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { getUserProfile } from '../services/api';
import { LocationService } from '../services/locationService';
import { Location } from '../types/locations';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  pin?: string;
  location?: string;
}

export interface UserContextType {
  user: UserProfile | null;
  userLocation: Location | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  roleHomePageId?: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setUserLocation(null);
        setLoading(false);
        return;
      }

      // Load user profile
      const profile = await getUserProfile();
      setUser(profile);

      // Load user location if specified
      if (profile.location) {
        // First try to find by location name (legacy)
        const locations = LocationService.getLocations();
        let location = locations.find(loc => loc.name === profile.location);
        
        // If not found by name, try by ID
        if (!location) {
          location = LocationService.getLocationById(profile.location);
        }
        
        setUserLocation(location || null);
      } else {
        setUserLocation(null);
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      setError(err.message || 'Failed to load user profile');
      setUser(null);
      setUserLocation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    loadUserProfile();

    // Listen for storage changes (e.g., token updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        loadUserProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: UserContextType = useMemo(() => ({
    user,
    userLocation,
    loading,
    error,
    refreshUser,
    isAuthenticated: !!user && !!localStorage.getItem('token'),
    roleHomePageId: undefined,
  }), [user, userLocation, loading, error, refreshUser]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};