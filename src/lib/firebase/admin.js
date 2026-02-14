
import { initializeApp, getApps, cert } from "firebase-admin/app";

export const initializeFirebaseAdmin = () => {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable for Firebase Admin SDK");
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (err) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  }
};
