// src/lib/firebase/admin.js
import admin from 'firebase-admin';

// Helper to initialize the Firebase Admin SDK.
export const initializeFirebaseAdmin = () => {
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

// Extracts the bearer token from a request object (works for both Pages and App Routers).
const getBearerToken = (req) => {
  const authHeader = req.headers.get ? req.headers.get('authorization') : req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

const createHttpError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

export const verifyIdTokenFromRequest = async (req) => {
  initializeFirebaseAdmin();
  const token = getBearerToken(req);

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

    throw createHttpError('Authentication failed.', 500);
  }
};

export const requireRole = async (req, allowedRoles = ['admin']) => {
  const decodedToken = await verifyIdTokenFromRequest(req);

  const claimRole = decodedToken.role;
  const hasLegacyAdminClaim = decodedToken.admin === true;

  if (allowedRoles.includes(claimRole) || (allowedRoles.includes('admin') && hasLegacyAdminClaim)) {
    return decodedToken;
  }

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

// Authenticates a request and verifies the user is an admin.
export const authenticate = async (req) => requireRole(req, ['admin']);

// Authenticates a request and returns the user's UID.
export const authenticateAndGetUid = async (req) => {
  const decodedToken = await verifyIdTokenFromRequest(req);
  return decodedToken.uid;
};


// Converts Firestore Timestamps to a JSON-serializable format
const serializeFirestoreData = (doc) => {
    const data = doc.data();
    const id = doc.id;
    const serializedData = { id };

    for (const [key, value] of Object.entries(data)) {
        if (value && value.toDate && typeof value.toDate === 'function') {
            serializedData[key] = value.toDate().toISOString();
        } else {
            serializedData[key] = value;
        }
    }
    return serializedData;
};


// Server-side function for fetching approved opportunities
export async function getApprovedOpportunities(limitN = 50) {
  await initializeFirebaseAdmin();
  const adminDb = admin.firestore();

  const qy = adminDb.collection('opportunities')
    .where('status', '==', 'approved')
    .orderBy('createdAt', 'desc')
    .limit(limitN);

  const snap = await qy.get();

  return snap.docs.map(serializeFirestoreData);
}

// Server-side function for listing showcase posts
export async function listShowcasePosts(limitN = 50) {
  await initializeFirebaseAdmin();
  const adminDb = admin.firestore();

  const qy = adminDb.collection('wallPosts')
    .orderBy('createdAt', 'desc')
    .limit(limitN);

  const snap = await qy.get();

  return snap.docs.map(serializeFirestoreData);
}

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

export async function listAllOpportunities() {
    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();
    const snap = await adminDb.collection('opportunities').get();
    return snap.docs.map(serializeFirestoreData);
}

export async function updateOpportunity(id, data) {
    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();
    await adminDb.collection('opportunities').doc(id).update(data);
}
