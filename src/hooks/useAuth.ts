import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';

// Local User type since firebase/auth is not available
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}; 