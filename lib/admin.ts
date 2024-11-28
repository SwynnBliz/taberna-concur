// lib/admin.ts
// Import Firebase Admin SDK to use server-side functionality of Firebase services
import admin from 'firebase-admin';

// Initialize the Firebase app instance along with the account credential like projectId, email and privateKey
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}
// Initialize and export the constant variable of Authentication of Firebase Admin to use its services on project
const adminAuth = admin.auth();
export { adminAuth };
