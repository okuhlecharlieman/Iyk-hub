import { db } from './firebase';
import { serverTimestamp, collection, addDoc } from 'firebase/firestore';

export async function trackPageView(userId, page) {
  if (!userId || !page) return;
  try {
    await addDoc(collection(db, 'engagementEvents'), {
      userId,
      eventType: 'page_view',
      metadata: { page },
      createdAt: serverTimestamp(),
    });
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
  } catch {
    // Silently fail — engagement tracking is non-critical
  }
}

export async function trackSessionDuration(userId, durationSeconds) {
  if (!userId || !durationSeconds) return;
  try {
    await addDoc(collection(db, 'engagementEvents'), {
      userId,
      eventType: 'session_end',
      metadata: { durationSeconds: Math.round(durationSeconds) },
      createdAt: serverTimestamp(),
    });
  } catch {
    // Silently fail — engagement tracking is non-critical
  }
}
