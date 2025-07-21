import { useState, useEffect } from 'react';
// import { User, onAuthStateChanged } from 'firebase/auth';
// import { auth } from '../services/firebase';

// Fallback type definition
type User = any;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if (!auth) {
    //   setLoading(false);
    //   return;
    // }

    // const unsubscribe = onAuthStateChanged(auth, (user: User) => {
    //   setUser(user);
    //   setLoading(false);
    // });

    // return () => unsubscribe();
    
    // Fallback implementation for build
    setUser(null);
    setLoading(false);
  }, []);

  return { user, loading };
}; 