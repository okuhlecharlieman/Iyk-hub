// src/lib/firebaseHelpers.js
import { auth, db, storage } from './firebase';
import {
  addDoc, collection, doc, getDoc, getDocs, limit,
  orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// NOTE: This file should ONLY contain client-side safe Firebase functions.

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
  }
}

export async function getUserDoc(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

// Showcase
export async function createShowcasePost(data) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const postData = { ...data, authorId: user.uid, createdAt: serverTimestamp() };
    const postRef = await addDoc(collection(db, 'wallPosts'), postData);
    return postRef.id;
}

export async function listShowcasePosts(limitN = 50) {
  const qy = query(collection(db, 'wallPosts'), orderBy('createdAt', 'desc'), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteShowcasePost(postId) {
    await deleteDoc(doc(db, 'wallPosts', postId));
}

export async function updateShowcasePost(postId, data) {
    const postRef = doc(db, 'wallPosts', postId);
    await updateDoc(postRef, { ...data, updatedAt: serverTimestamp() });
}


// Storage
export async function uploadToStorage(file, prefix = 'uploads') {
  const fileRef = ref(storage, `${prefix}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
