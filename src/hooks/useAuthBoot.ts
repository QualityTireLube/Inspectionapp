import { useEffect } from 'react';
import { getToken, isTokenExpired, clearAllAuthStorage, startExpiryWatcher, logout } from '../auth';

/**
 * Authentication boot hook that validates tokens on app startup and handles cross-tab logout
 */
function useAuthBoot() {
  useEffect(() => {
    // Normalize legacy key: if only LEGACY exists, copy to canonical
    try {
      const legacy = localStorage.getItem('token');
      const canonical = localStorage.getItem('access_token');
      if (legacy && !canonical) {
        localStorage.setItem('access_token', legacy);
      }
    } catch {/* ignore Safari localStorage errors */}

    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearAllAuthStorage();
      // don't loop if already on login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login?expired=true');
      }
    } else {
      startExpiryWatcher();
    }

    // Cross-tab logout: listen for storage events
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'token') {
        const current = getToken();
        if (!current || isTokenExpired(current)) {
          logout(true);
        }
      }
    };
    
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

export default useAuthBoot;
