/**
 * Client-side Firebase initialization module.
 *
 * Sets up the Firebase app, Firestore database, and Firebase Authentication
 * for use in browser-side React components. Uses persistent local caching
 * with multi-tab support so Firestore data survives page reloads.
 *
 * Environment variables (NEXT_PUBLIC_FIREBASE_*) must be set in .env.local.
 * On the server side (SSR) this module is a no-op — `auth` and `db` will be null.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

/** Firebase project configuration pulled from environment variables. */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Checks whether a config value is effectively missing.
 * @param {string|undefined} v - The value to check.
 * @returns {boolean} True if the value is empty, undefined, or the literal string "undefined"/"null".
 */
function missing(v) {
  return !v || v === 'undefined' || v === 'null';
}

/**
 * Returns true when both apiKey and projectId are present, meaning
 * the client SDK can be initialised safely.
 * @returns {boolean}
 */
function hasUsableClientConfig() {
  return !missing(firebaseConfig.apiKey) && !missing(firebaseConfig.projectId);
}

/** True when running in a browser context (not during SSR). */
const isBrowser = typeof window !== 'undefined';

/** True only when we're in a browser AND the required env vars exist. */
const canInitializeClientFirebase = isBrowser && hasUsableClientConfig();

// Warn developers early if env vars are missing on the client.
if (isBrowser && !canInitializeClientFirebase) {
  console.error('Firebase env vars are missing. Check .env.local (must use NEXT_PUBLIC_ prefixes).', firebaseConfig);
}

/**
 * The singleton Firebase App instance.
 * Reuses an existing app if one was already initialised (hot-reload safe).
 * Null during SSR or when env vars are missing.
 */
const app = canInitializeClientFirebase ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

/**
 * Firestore database instance with offline persistence.
 * Falls back to the default Firestore if persistent cache init fails
 * (e.g. in browsers that don't support IndexedDB).
 */
let db = null;

if (app) {
  try {
    // Enable persistent local cache with multi-tab synchronisation.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    // Fallback: use default Firestore without persistence (already initialised).
    db = getFirestore(app);
  }
}

/** Firebase Authentication instance — null during SSR. */
export const auth = app ? getAuth(app) : null;

/** Firestore database instance — null during SSR. */
export { db };
