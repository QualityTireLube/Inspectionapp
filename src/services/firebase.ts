// 🧠 Cursor: Firebase service with proper imports now that firebase package is installed
// Previous fallback implementations replaced with real Firebase imports

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: any = null;
let db: any = null;
let storage: any = null;
let auth: any = null;

try {
  // Check if we have Firebase config
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase config missing - using fallback implementation');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

// Export Firebase services (with fallbacks for development)
export { auth, db, storage, app };

// Fallback implementations for when Firebase is not available
export const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
  signOut: () => Promise.resolve(),
  onAuthStateChanged: () => () => {}
};

export const mockDb = {
  collection: () => ({
    doc: () => ({
      set: () => Promise.resolve(),
      get: () => Promise.resolve({ exists: () => false, data: () => null }),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve()
    }),
    add: () => Promise.resolve({ id: 'mock-id' }),
    where: () => ({
      get: () => Promise.resolve({ empty: true, docs: [] })
    })
  })
};

export const mockStorage = {
  ref: () => ({
    child: () => ({
      put: () => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('mock-url') } }),
      getDownloadURL: () => Promise.resolve('mock-url'),
      delete: () => Promise.resolve()
    })
  })
};

// Use real Firebase if available, otherwise use mocks
export default {
  auth: auth || mockAuth,
  db: db || mockDb,
  storage: storage || mockStorage
}; 