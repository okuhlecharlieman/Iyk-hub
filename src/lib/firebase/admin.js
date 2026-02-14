// src/lib/firebase/admin.js
import admin from 'firebase-admin';

// Helper to initialize the Firebase Admin SDK.
// This is safe to call multiple times.
export const initializeFirebaseAdmin = async () => {
  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }

  try {
    await admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    // Hide sensitive details in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Failed to initialize Firebase Admin SDK. Check server logs for details.");
    }
    throw error;
  }
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
  
  console.log('Fetching approved opportunities on the server...');
  
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

  console.log('Fetching showcase posts on the server...');

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
