// src/lib/firebaseHelpers.js
import { auth, db, storage } from './firebase';
import {
  addDoc, collection, doc, getDoc, getDocs, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// NOTE: This file should ONLY contain client-side safe Firebase functions.
// Server-side logic (using firebase-admin) must be in /api routes.

// Users
export async function ensureUserDoc(user) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
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
    const data = snap.data();
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
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

// Points
export async function awardPoints(uid, amount, reason) {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('User not found');
    const data = snap.data();
    const prevPoints = data.points || { weekly: 0, lifetime: 0 };
    tx.update(userRef, { 
        points: { 
            weekly: (prevPoints.weekly || 0) + amount, 
            lifetime: (prevPoints.lifetime || 0) + amount 
        }
    });
  });
  await addDoc(collection(db, 'users', uid, 'pointsLog'), { amount, reason, createdAt: serverTimestamp() });
}

// Showcase
export async function createShowcasePost({ type, title, description, mediaUrl, code, language }, uid) {
  return addDoc(collection(db, 'wallPosts'), {
    uid,
    type,
    title: title || '',
    description: description || '',
    mediaUrl: mediaUrl || null,
    code: code || null,
    language: language || null,
    reactions: { '❤️': 0, '🎉': 0, '👍': 0 },
    visibility: 'public',
    createdAt: serverTimestamp(),
  });
}

export async function updateShowcasePost(postId, data) {
    const postRef = doc(db, 'wallPosts', postId);
    await updateDoc(postRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteShowcasePost(postId) {
    await deleteDoc(doc(db, 'wallPosts', postId));
}

export async function listShowcasePosts(limitN = 50) {
  const qy = query(collection(db, 'wallPosts'), orderBy('createdAt', 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listUserShowcasePosts(uid, limitN = 50) {
  const qy = query(collection(db, 'wallPosts'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Storage
export async function uploadToStorage(file, prefix = 'uploads') {
  const fileRef = ref(storage, `${prefix}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

// Leaderboard
export async function listTopUsers(limitN = 20, filter = 'lifetime') {
  const field = filter === 'weekly' ? 'points.weekly' : 'points.lifetime';
  const qy = query(collection(db, 'users'), orderBy(field, 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
