import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

const BATCH_LIMIT = 400;
const PAGE_SIZE = 400;

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return null;
};

export async function runCreatorBoostLifecycleJob() {
  await initializeFirebaseAdmin();
  const db = admin.firestore();

  const now = Date.now();

  let batch = db.batch();
  let opCount = 0;
  let activated = 0;
  let expired = 0;

  const commitIfNeeded = async () => {
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  };

  let paidPendingCursor = null;
  while (true) {
    let query = db
      .collection('creatorBoostOrders')
      .where('paymentStatus', '==', 'paid')
      .where('activationStatus', '==', 'pending_activation')
      .limit(PAGE_SIZE);

    if (paidPendingCursor) {
      query = query.startAfter(paidPendingCursor);
    }

    const pageSnap = await query.get();
    if (pageSnap.empty) {
      break;
    }

    for (const doc of pageSnap.docs) {
      const data = doc.data();
      const durationHours = Number(data.durationHours || 0);
      const expiresAt = new Date(now + Math.max(durationHours, 0) * 60 * 60 * 1000);

      batch.set(doc.ref, {
        activationStatus: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      activated += 1;
      opCount += 1;
      await commitIfNeeded();
    }

    paidPendingCursor = pageSnap.docs[pageSnap.docs.length - 1];
  }

  let activeCursor = null;
  while (true) {
    let query = db
      .collection('creatorBoostOrders')
      .where('activationStatus', '==', 'active')
      .limit(PAGE_SIZE);

    if (activeCursor) {
      query = query.startAfter(activeCursor);
    }

    const pageSnap = await query.get();
    if (pageSnap.empty) {
      break;
    }

    for (const doc of pageSnap.docs) {
      const data = doc.data();
      const expiresAtMillis = toMillis(data.expiresAt);
      if (!expiresAtMillis || expiresAtMillis > now) {
        continue;
      }

      batch.set(doc.ref, {
        activationStatus: 'expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      expired += 1;
      opCount += 1;
      await commitIfNeeded();
    }

    activeCursor = pageSnap.docs[pageSnap.docs.length - 1];
  }

  if (opCount > 0) {
    await batch.commit();
  }

  await db.collection('systemJobs').doc('creatorBoostLifecycle').set({
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    activated,
    expired,
  }, { merge: true });

  return { activated, expired };
}
