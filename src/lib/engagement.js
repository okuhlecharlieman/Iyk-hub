/**
 * Engagement tracking library — writes events to `engagementEvents` collection.
 *
 * Event types:
 *   - page_view: tracked by EngagementTracker on route change
 *   - session_duration: tracked when user leaves or navigates away
 *   - game_play, game_win: tracked by individual game components
 *
 * The admin Engagement API (/api/admin/engagement) aggregates these events
 * for the dashboard, computing feature adoption, top pages, and trends.
 */
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
