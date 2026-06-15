/**
 * Server-side Firebase Admin SDK module.
 *
 * Provides helpers for initialising the Admin SDK, verifying JWTs,
 * enforcing role-based access control, and reading Firestore data.
 * Used exclusively in API route handlers (runs on the server).
 */
import admin from 'firebase-admin';

/**
 * Initialises the Firebase Admin SDK using a service-account JSON
 * stored in the FIREBASE_SERVICE_ACCOUNT_KEY (or FIREBASE_SERVICE_ACCOUNT)
 * environment variable.  Safe to call multiple times — only the first
 * call actually initialises; subsequent calls are no-ops.
 *
 * @throws {Error} If the environment variable is missing or the JSON is invalid.
 */
export const initializeFirebaseAdmin = () => {
  // Prevent double-init (hot-reload safe).
  if (admin.apps.length > 0) {
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT environment variable.');
  }

  try {
    const parsed = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK: ' + (error?.message || 'unknown error'));
  }
};

/**
 * Extracts a Bearer token from the request's Authorization header.
 * Works with both standard Headers objects (Next.js App Router) and
 * plain objects.
 *
 * @param {Request} req - The incoming HTTP request.
 * @returns {string|null} The raw JWT string, or null if not present.
 */
const extractBearerToken = (req) => {
  const authHeader = req.headers?.get ? req.headers.get('authorization') : req.headers?.authorization;
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return null;
  }
  return authHeader.replace(/^Bearer\s+/i, '').trim();
};

/**
 * Verifies a Firebase ID token and returns the decoded claims.
 *
 * @param {string} token - The raw JWT string.
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 * @throws {Error} With code 401 if the token is invalid.
 */
const verifyIdToken = async (token) => {
  const decoded = await admin.auth().verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    const err = new Error('Invalid ID token');
    err.code = 401;
    throw err;
  }
  return decoded;
};

/**
 * Creates an Error object with a custom HTTP status code.
 *
 * @param {string} message - Human-readable error description.
 * @param {number} code    - HTTP status code (e.g. 401, 403, 500).
 * @returns {Error}
 */
const createHttpError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

/**
 * Extracts and verifies the Bearer token from a request.
 * Initialises the Admin SDK if needed.
 *
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>} Decoded token claims.
 * @throws {Error} 401 if no token or token is invalid/expired.
 */
export const verifyIdTokenFromRequest = async (req) => {
  initializeFirebaseAdmin();
  const token = extractBearerToken(req);
  if (!token) {
    throw createHttpError('Not authenticated. No token provided.', 401);
  }

  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error('Authentication error:', error?.message || error);

    if (error?.code === 'auth/id-token-expired' || error?.code === 'auth/argument-error') {
      throw createHttpError('Invalid or expired authentication token.', 401);
    }

    throw createHttpError('Authentication failed.', 401);
  }
};

/**
 * Authenticates a request AND verifies the user has one of the
 * allowed roles.  Checks custom claims first, then falls back to the
 * Firestore `users` document's `role` field.
 *
 * @param {Request}  req          - The incoming HTTP request.
 * @param {string[]} allowedRoles - Array of role keys (e.g. ['admin', 'operations']).
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>} Decoded token.
 * @throws {Error} 401 / 403 / 500.
 */
export const requireRole = async (req, allowedRoles = ['admin']) => {
  const decodedToken = await verifyIdTokenFromRequest(req);

  // Check custom claims for a matching role.
  const claimRole = decodedToken.role;
  const hasLegacyAdminClaim = decodedToken.admin === true;

  if (allowedRoles.includes(claimRole) || (allowedRoles.includes('admin') && hasLegacyAdminClaim)) {
    return decodedToken;
  }

  // Fallback: look up the role stored in the Firestore user document.
  try {
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    const firestoreRole = userDoc.exists ? userDoc.data()?.role : null;

    if (allowedRoles.includes(firestoreRole)) {
      return decodedToken;
    }
  } catch (error) {
    console.error('Role lookup error:', error?.message || error);
    throw createHttpError('Failed to verify user role.', 500);
  }

  throw createHttpError('Not authorized for this resource.', 403);
};

/**
 * Shortcut: authenticate and require the 'admin' role.
 * @param {Request} req
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 */
export const authenticate = async (req) => requireRole(req, ['admin']);

/**
 * Shortcut: authenticate and require one of the specified roles.
 * @param {Request}  req
 * @param {string[]} allowedRoles
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 */
export const authenticateWithRoles = async (req, allowedRoles = ['admin']) => requireRole(req, allowedRoles);

/**
 * Authenticate the request and return just the user's UID.
 * Useful when you need the caller's identity but don't need role checks.
 *
 * @param {Request} req
 * @returns {Promise<string>} The authenticated user's UID.
 */
export const authenticateAndGetUid = async (req) => {
  const decodedToken = await verifyIdTokenFromRequest(req);
  return decodedToken.uid;
};

/**
 * Converts a Firestore document snapshot into a plain JSON-serializable object.
 * Firestore Timestamp fields are converted to ISO-8601 strings.
 *
 * @param {import('firebase-admin/firestore').DocumentSnapshot} doc
 * @returns {Object} Plain object with `id` plus all document fields.
 */
const serializeFirestoreData = (doc) => {
    const data = doc.data();
    const id = doc.id;
    const serializedData = { id };

    for (const [key, value] of Object.entries(data)) {
        if (value && value.toDate && typeof value.toDate === 'function') {
            // Convert Firestore Timestamp → ISO string.
            serializedData[key] = value.toDate().toISOString();
        } else {
            serializedData[key] = value;
        }
    }
    return serializedData;
};

/**
 * Lists every user record from Firebase Auth.
 * Returns a simplified array of user objects (uid, email, displayName, etc.).
 *
 * @returns {Promise<Array<{uid:string,email:string,displayName:string,photoURL:string,disabled:boolean,customClaims:Object}>>}
 */
export async function listAllUsers() {
    await initializeFirebaseAdmin();
    const adminAuth = admin.auth();
    const userRecords = await adminAuth.listUsers();
    return userRecords.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        disabled: user.disabled,
        customClaims: user.customClaims
    }));
}

/**
 * Fetches all documents from the 'opportunities' Firestore collection.
 * Timestamps are serialised to ISO strings.
 *
 * @returns {Promise<Object[]>} Array of serialised opportunity objects.
 */
export async function listAllOpportunities() {
    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();
    const snap = await adminDb.collection('opportunities').get();
    return snap.docs.map(serializeFirestoreData);
}
