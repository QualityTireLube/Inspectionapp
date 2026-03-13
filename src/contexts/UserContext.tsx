import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { getUserProfile } from '../services/api';
import { LocationService } from '../services/locationService';
import { Location } from '../types/locations';
import { onAuthChange } from '../services/firebase/auth';
import { User } from 'firebase/auth';

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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthChange((fbUser) => {
      setFirebaseUser(fbUser);
    });
    return unsubscribe;
  }, []);

  const loadUserProfile = useCallback(async (fbUser: User | null) => {
    if (!fbUser) {
      setUser(null);
      setUserLocation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to load profile from the backend API
      try {
        const profile = await getUserProfile();
        setUser(profile);

        if (profile.location) {
          const locations = LocationService.getLocations();
          let location = locations.find(loc => loc.name === profile.location);
          if (!location) location = LocationService.getLocationById(profile.location);
          setUserLocation(location || null);
        } else {
          setUserLocation(null);
        }
      } catch {
        // Backend unavailable — fall back to Firebase user data
        setUser({
          name: fbUser.displayName || fbUser.email || 'User',
          email: fbUser.email || '',
          role: localStorage.getItem('userRole') || 'user',
        });
        setUserLocation(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUserProfile(firebaseUser);
  }, [loadUserProfile, firebaseUser]);

  useEffect(() => {
    loadUserProfile(firebaseUser);
  }, [firebaseUser]);

  const value: UserContextType = useMemo(() => ({
    user,
    userLocation,
    loading,
    error,
    refreshUser,
    isAuthenticated: !!firebaseUser,
    roleHomePageId: undefined,
  }), [user, userLocation, loading, error, refreshUser, firebaseUser]);

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