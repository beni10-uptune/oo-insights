import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (getApps().length === 0) {
  // Use service account credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Fallback to default credentials (for local development with gcloud)
    initializeApp();
  }
}

export const adminAuth = getAuth();