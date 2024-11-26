// lib/admin.ts
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK only if it isn't already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

// Export adminAuth for use in other parts of the application
const adminAuth = admin.auth();

export { adminAuth };