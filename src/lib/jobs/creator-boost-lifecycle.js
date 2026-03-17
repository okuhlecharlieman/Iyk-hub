import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

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

  const paidPendingSnap = await db
    .collection('creatorBoostOrders')
    .where('paymentStatus', '==', 'paid')
    .where('activationStatus', '==', 'pending_activation')
    .limit(400)
    .get();

  const activeSnap = await db
    .collection('creatorBoostOrders')
    .where('activationStatus', '==', 'active')
    .limit(400)
    .get();

  let batch = db.batch();
  let opCount = 0;
  let activated = 0;
  let expired = 0;

  const commitIfNeeded = async () => {
    if (opCount >= 400) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  };

  for (const doc of paidPendingSnap.docs) {
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

  for (const doc of activeSnap.docs) {
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
