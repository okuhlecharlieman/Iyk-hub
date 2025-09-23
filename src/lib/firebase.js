// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function missing(v) {
  return !v || v === 'undefined' || v === 'null';
}

if (typeof window !== 'undefined') {
  if (missing(firebaseConfig.apiKey) || missing(firebaseConfig.projectId)) {
    console.error('Firebase env vars are missing. Check .env.local (must use NEXT_PUBLIC_ prefixes).', firebaseConfig);
  }
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Use persistent cache to make SDK more resilient
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  db = getFirestore(app);
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export { db };