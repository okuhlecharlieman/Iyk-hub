// src/lib/firebaseHelpers.js
import { auth, db, storage } from './firebase';
import {
  addDoc, collection, doc, getDoc, getDocs, increment, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e.stack);
  }
}

// Users
export async function ensureUserDoc(user) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || 'Intwana',
      email: user.email || null,
      photoURL: user.photoURL || null,
      points: { weekly: 0, lifetime: 0 },
      bio: '',
      skills: [],
      role: 'user',
      createdAt: serverTimestamp(),
    });
  } else {
    const updates = {};
    if (!data.email && user.email) {
      updates.email = user.email;
    }
    if (typeof data.points === 'number') {
      updates.points = { weekly: data.points || 0, lifetime: data.points || 0 };
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }
  }
}

export async function getUserDoc(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  
  const data = snap.data();
  // Ensure email is present, if not, fetch from Auth
  if (!data.email) {
    try {
      const authUser = await admin.auth().getUser(uid);
      data.email = authUser.email;
      // Optionally, update the document with the fetched email
      await updateDoc(doc(db, 'users', uid), { email: authUser.email });
    } catch (e) {
      console.error(`Failed to fetch email for user ${uid}:`, e);
    }
  }
  return { id: uid, ...data };
}

export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function listAllUsers() {
  const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(qy);
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Fetch emails from Firebase Auth for users who are missing it
  const authUsers = await admin.auth().listUsers();
  const emailMap = authUsers.users.reduce((acc, user) => {
    acc[user.uid] = user.email;
    return acc;
  }, {});

  return users.map(user => {
    if (!user.email && emailMap[user.id]) {
      user.email = emailMap[user.id];
    }
    return user;
  });
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

// Points, Opportunities, Showcase, etc. (rest of the file is unchanged)
// ... (omitted for brevity) ...
