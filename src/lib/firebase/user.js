"use client";
/**
 * Client-side user data helpers.
 *
 * Fetches user profile documents and profile-view analytics
 * directly from Firestore on the client.
 */
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase.js';

/**
 * Fetches a single user document from the `users` Firestore collection
 * and adds a derived `isAdmin` flag.
 *
 * @param {string} uid - The user's UID (also the document ID).
 * @returns {Promise<Object|null>} The user object with `id` and `isAdmin`, or null if not found.
 */
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

/**
 * Fetches the last 7 days of profile-view counts from the
 * `users/{uid}/dailyViews` sub-collection.
 *
 * Returns an array of { date, count } objects in chronological order,
 * with zero-filled entries for days with no views.
 *
 * @param {string} uid - The user's UID.
 * @returns {Promise<Array<{date: string, count: number}>>} Daily view counts (oldest → newest).
 */
export async function getDailyViews(uid) {
  if (!uid) return [];
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // Fetch up to 7 most recent dailyViews sub-documents.
  const dailyViewsRef = collection(db, 'users', uid, 'dailyViews');
  const q = query(dailyViewsRef, orderBy('__name__', 'desc'), limit(7));
  
  const querySnapshot = await getDocs(q);
  
  let views = [];
  let dateMap = {};

  // Build a lookup map: date string → view count.
  querySnapshot.forEach(doc => {
    dateMap[doc.id] = doc.data().count;
  });

  // Create a list of the last 7 days and fill in the view counts.
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    views.push({ date: dateStr, count: dateMap[dateStr] || 0 });
  }

  return views.reverse(); // Return in chronological order (oldest first).
}
