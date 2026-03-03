"use client";
// src/lib/firebase/user.js
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Corrected import path

export async function getUserDoc(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const data = snap.data();
    return {
      id: uid,
      ...data,
      isAdmin: data.role === 'admin',
    };
  }
  return null;
}
