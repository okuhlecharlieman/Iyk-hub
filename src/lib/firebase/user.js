"use client";
// src/lib/firebase/user.js
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase.js'; // Corrected import path

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

export async function getDailyViews(uid) {
  if (!uid) return [];
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const dailyViewsRef = collection(db, 'users', uid, 'dailyViews');
  const q = query(dailyViewsRef, orderBy('__name__', 'desc'), limit(7));
  
  const querySnapshot = await getDocs(q);
  
  let views = [];
  let dateMap = {};

  querySnapshot.forEach(doc => {
    dateMap[doc.id] = doc.data().count;
  });

  // Create a list of the last 7 days and fill in the view counts
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    views.push({ date: dateStr, count: dateMap[dateStr] || 0 });
  }

  return views.reverse(); // Return in chronological order
}
