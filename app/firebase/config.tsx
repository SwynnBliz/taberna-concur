/** /app/firebase/config.tsx (Firebase Config File) */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth"; // Import setPersistence
import { getFirestore } from "firebase/firestore"; // Import Firestore

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if there are no existing apps
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get the authentication instance
const auth = getAuth(app);

// Set session persistence to local for the authentication session
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Session persistence set to local');
  })
  .catch((error) => {
    console.error('Failed to set persistence:', error);
  });

const googleProvider = new GoogleAuthProvider(); // Initialize Google provider

// Initialize Firestore
const firestore = getFirestore(app); // Initialize Firestore

// Export the app, auth, firestore, and provider for use in other parts of the application
export { app, auth, googleProvider, firestore };