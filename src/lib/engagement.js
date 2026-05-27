import { db } from './firebase';
import { doc, setDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';

export async function trackPageView(userId, page) {
  if (!userId || !page) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const ref = doc(db, 'engagement', `${today}_${userId}`);
    await setDoc(ref, {
      userId,
      date: today,
      lastActiveAt: serverTimestamp(),
      [`pages.${page.replace(/\//g, '_')}`]: increment(1),
      totalPageViews: increment(1),
    }, { merge: true });
  } catch {
    // Silently fail — engagement tracking is non-critical
  }
}

export async function trackEvent(userId, eventType, metadata = {}) {
  if (!userId || !eventType) return;
  try {
    await addDoc(collection(db, 'engagementEvents'), {
      userId,
      eventType,
      metadata,
      createdAt: serverTimestamp(),
    });

    const today = new Date().toISOString().split('T')[0];
    const ref = doc(db, 'engagement', `${today}_${userId}`);
    await setDoc(ref, {
      userId,
      date: today,
      lastActiveAt: serverTimestamp(),
      [`events.${eventType}`]: increment(1),
    }, { merge: true });
  } catch {
    // Silently fail — engagement tracking is non-critical
  }
}

export async function trackSessionDuration(userId, durationSeconds) {
  if (!userId || !durationSeconds) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const ref = doc(db, 'engagement', `${today}_${userId}`);
    await setDoc(ref, {
      userId,
      date: today,
      totalSessionSeconds: increment(Math.round(durationSeconds)),
    }, { merge: true });
  } catch {
    // Silently fail — engagement tracking is non-critical
  }
}
