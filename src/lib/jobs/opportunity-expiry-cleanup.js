import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

const BATCH_LIMIT = 200;

export async function cleanupExpiredOpportunities() {
  await initializeFirebaseAdmin();
  const db = admin.firestore();
  const now = new Date();
  const querySnapshot = await db
    .collection('opportunities')
    .where('deletionScheduledAt', '<=', now)
    .limit(BATCH_LIMIT)
    .get();

  if (querySnapshot.empty) {
    return { deleted: 0 };
  }

  let batch = db.batch();
  let counter = 0;

  for (const docSnap of querySnapshot.docs) {
    batch.delete(docSnap.ref);
    counter += 1;

    if (counter >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      counter = 0;
    }
  }

  if (counter > 0) {
    await batch.commit();
  }

  await db.collection('systemJobs').doc('opportunityExpiryCleanup').set({
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedCount: querySnapshot.size,
  }, { merge: true });

  return { deleted: querySnapshot.size };
}
