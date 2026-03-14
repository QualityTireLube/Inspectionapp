import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
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

      // Load profile from Firestore users/{uid} document
      let profile: UserProfile | null = null;
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          profile = {
            name:     data.name     || fbUser.displayName || fbUser.email || 'User',
            email:    data.email    || fbUser.email || '',
            role:     data.role     || 'technician',
            pin:      data.pin,
            location: data.location,
          };
        }
      } catch {
        // Firestore read failed — build a minimal profile from Firebase Auth
      }

      // Fallback: use Firebase Auth fields if Firestore doc doesn't exist yet
      if (!profile) {
        profile = {
          name:  fbUser.displayName || fbUser.email || 'User',
          email: fbUser.email || '',
          role:  localStorage.getItem('userRole') || 'technician',
        };
      }

      setUser(profile);

      if (profile.location) {
        const locations = LocationService.getLocations();
        const location =
          locations.find(loc => loc.name === profile!.location) ||
          LocationService.getLocationById(profile!.location!) ||
          null;
        setUserLocation(location);
      } else {
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
