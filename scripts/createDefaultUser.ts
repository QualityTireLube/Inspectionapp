const { initializeApp } = require('firebase/app');
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} = require('firebase/auth');
require('dotenv').config();

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'Admin123!';

async function createDefaultUser() {
  try {
    // Try to sign in first
    try {
      await signInWithEmailAndPassword(auth, DEFAULT_EMAIL, DEFAULT_PASSWORD);
      console.log('Default user already exists');
      return;
    } catch (error) {
      // User doesn't exist, continue with creation
    }

    // Create the user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      DEFAULT_EMAIL,
      DEFAULT_PASSWORD
    );

    // Send verification email
    await sendEmailVerification(userCredential.user);

    console.log('Default user created successfully');
    console.log('Email:', DEFAULT_EMAIL);
    console.log('Password:', DEFAULT_PASSWORD);
    console.log('Please check your email to verify the account');
  } catch (error) {
    console.error('Error creating default user:', error);
  }
}

createDefaultUser(); 