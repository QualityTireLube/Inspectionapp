import { jwtDecode } from 'jwt-decode';
import { getItem as safariGetItem, setItem as safariSetItem, removeItem as safariRemoveItem } from './services/safariStorage';

const TOKEN_KEY = 'access_token';
const LEGACY_TOKEN_KEY = 'token';
const EXPIRES_AT_KEY = 'auth_expires_at';

export const getToken = (): string | null => {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY)
      || localStorage.getItem(LEGACY_TOKEN_KEY)
      || sessionStorage.getItem(TOKEN_KEY)
      || sessionStorage.getItem(LEGACY_TOKEN_KEY);
  } catch {
    // ignore and fallback below
  }
  if (token) return token;
  // Final fallback to Safari storage (memory) if normal storages are blocked or empty
  return safariGetItem(TOKEN_KEY) || safariGetItem(LEGACY_TOKEN_KEY);
};

export const setToken = (token: string) => {
  // canonicalize to access_token; keep legacy mirror for compatibility
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  } catch {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(LEGACY_TOKEN_KEY, token);
  }
  // Always set Safari storage fallback (memory/session/local depending on availability)
  try { safariSetItem(TOKEN_KEY, token); } catch {}
  try { safariSetItem(LEGACY_TOKEN_KEY, token); } catch {}
};

// Store token along with explicit expiry from server (seconds from now)
export const setAuthToken = (token: string, expiresInSeconds?: number) => {
  setToken(token);
  if (expiresInSeconds && Number.isFinite(expiresInSeconds)) {
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;
    const expiresAtSerialized = String(expiresAtMs); // store as epoch ms to avoid Safari date parsing issues
    try {
      localStorage.setItem(EXPIRES_AT_KEY, expiresAtSerialized);
    } catch {
      try { sessionStorage.setItem(EXPIRES_AT_KEY, expiresAtSerialized); } catch {}
    }
    try { safariSetItem(EXPIRES_AT_KEY, expiresAtSerialized); } catch {}
  } else {
    // Clear any stale explicit expiry if not provided
    try { localStorage.removeItem(EXPIRES_AT_KEY); } catch {}
    try { sessionStorage.removeItem(EXPIRES_AT_KEY); } catch {}
    try { safariRemoveItem(EXPIRES_AT_KEY); } catch {}
  }
};

export const clearAllAuthStorage = () => {
  // List of all possible auth-related keys
  const authKeys = [
    TOKEN_KEY,
    LEGACY_TOKEN_KEY,
    EXPIRES_AT_KEY,
    'userName',
    'userEmail',
    'userRole',
    'userId',
    'printServerToken',
    'printClientToken',
    'print_server_token',
    'websocket_token',
    'auth_timestamp',
    'lastLoginTime'
  ];

  // Clear localStorage
  try {
    authKeys.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Cleared localStorage auth data');
  } catch (e) {
    console.warn('⚠️ Could not clear localStorage:', e);
  }

  // Clear sessionStorage
  try {
    authKeys.forEach(key => sessionStorage.removeItem(key));
    console.log('🧹 Cleared sessionStorage auth data');
  } catch (e) {
    console.warn('⚠️ Could not clear sessionStorage:', e);
  }

  // Clear Safari fallback storage as well
  try {
    authKeys.forEach(key => safariRemoveItem(key));
  } catch {}
};

// Debug function to inspect current storage state
export const debugAuthStorage = () => {
  console.log('🔍 === AUTH STORAGE DEBUG ===');
  
  // Check localStorage
  try {
    const localKeys = Object.keys(localStorage);
    console.log('📦 localStorage keys:', localKeys);
    localKeys.forEach(key => {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('user')) {
        console.log(`  🔑 ${key}:`, localStorage.getItem(key));
      }
    });
  } catch (e) {
    console.warn('⚠️ Cannot access localStorage:', e);
  }

  // Check sessionStorage
  try {
    const sessionKeys = Object.keys(sessionStorage);
    console.log('💾 sessionStorage keys:', sessionKeys);
    sessionKeys.forEach(key => {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('user')) {
        console.log(`  🔑 ${key}:`, sessionStorage.getItem(key));
      }
    });
  } catch (e) {
    console.warn('⚠️ Cannot access sessionStorage:', e);
  }

  // Check current token state
  console.log('🎫 Current token:', getToken());
  console.log('⏰ Token expired:', isTokenExpired());
  console.log('🔍 === END AUTH STORAGE DEBUG ===');
};

export const isTokenExpired = (token?: string | null): boolean => {
  const t = token ?? getToken();
  if (!t) return true;

  // Prefer explicit server-provided expiry if present
  const nowMs = Date.now();
  let explicitExpiryMs: number | null = null;
  try {
    const ls = localStorage.getItem(EXPIRES_AT_KEY);
    if (ls) {
      explicitExpiryMs = /^\d+$/.test(ls) ? parseInt(ls, 10) : Date.parse(ls);
    }
  } catch {}
  if (explicitExpiryMs == null) {
    try {
      const ss = sessionStorage.getItem(EXPIRES_AT_KEY);
      if (ss) {
        explicitExpiryMs = /^\d+$/.test(ss) ? parseInt(ss, 10) : Date.parse(ss);
      }
    } catch {}
  }
  if (explicitExpiryMs == null) {
    try {
      const sf = safariGetItem(EXPIRES_AT_KEY);
      if (sf) {
        explicitExpiryMs = /^\d+$/.test(sf) ? parseInt(sf, 10) : Date.parse(sf);
      }
    } catch {}
  }
  if (explicitExpiryMs && Number.isFinite(explicitExpiryMs)) {
    // Small skew for safety
    return explicitExpiryMs <= nowMs + 5000;
  }

  // Fallback to JWT exp if token is a JWT
  try {
    const { exp } = jwtDecode<{ exp?: number }>(t);
    if (!exp) {
      // If no exp claim and no explicit expiry, assume valid and let server 401 drive logout
      return false;
    }
    return exp * 1000 <= nowMs + 5000;
  } catch {
    // Non-JWT tokens: assume valid; server 401 will trigger logout
    return false;
  }
};

export const logout = (redirect = true) => {
  clearAllAuthStorage();
  stopExpiryWatcher();
  if (redirect) {
    window.location.replace('/login?expired=true');
  }
};

// Optional: background check every 60s to proactively logout near expiry
let _expiryTimer: number | undefined;
export const startExpiryWatcher = () => {
  stopExpiryWatcher();
  _expiryTimer = window.setInterval(() => {
    // Only clear storage when the legacy JWT expires; do not redirect
    // since Firebase manages the active session independently.
    if (isTokenExpired()) clearAllAuthStorage();
  }, 60_000);
};

export const stopExpiryWatcher = () => {
  if (_expiryTimer) window.clearInterval(_expiryTimer);
};

// Legacy aliases for backward compatibility
export { TOKEN_KEY };
export const parseJwt = (token: string): any | null => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

export const isExpired = (token: string | null | undefined, skewMs: number = 30000): boolean => {
  if (!token) return true;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (!exp) return true;
    const nowMs = Date.now();
    const expMs = exp * 1000;
    return expMs - nowMs <= skewMs;
  } catch {
    return true;
  }
};

export const clearToken = clearAllAuthStorage;
export const scheduleAutoLogout = startExpiryWatcher;
export const cancelAutoLogout = stopExpiryWatcher;
export { EXPIRES_AT_KEY };