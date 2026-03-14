import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase web credentials are intentionally public — they identify the project.
// Security is enforced by Firestore/Storage rules, not by keeping these values secret.
// Env vars are preferred (override at build time via Amplify Console or .env),
// but the project values are embedded as fallbacks so the app always works.
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyBiDX4q8XSSUFVsCIgB9kfDH4aWN7ttdpU',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'inspectionapp-b9a42.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'inspectionapp-b9a42',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'inspectionapp-b9a42.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '960984953591',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:960984953591:web:04aec332a0243b93a759f2',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     ?? 'G-6FB0K70FZ6',
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
export let firebaseInitError: string | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('✅ Firebase initialized successfully');
} catch (error: any) {
  firebaseInitError = error?.message ?? 'Unknown Firebase initialization error';
  console.error('❌ Firebase initialization error:', firebaseInitError);
  // Do not re-throw — let the app render an error UI instead of a blank page.
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage };
