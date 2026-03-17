import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

const BATCH_LIMIT = 400;
const PAGE_SIZE = 500;

export async function resetWeeklyLeaderboardPoints() {
  await initializeFirebaseAdmin();

  const db = admin.firestore();
  let batch = db.batch();
  let opCount = 0;
  let updatedUsers = 0;
  let cursor = null;

  while (true) {
    let query = db.collection('users').limit(PAGE_SIZE);
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const usersSnap = await query.get();
    if (usersSnap.empty) {
      break;
    }

    for (const userDoc of usersSnap.docs) {
      batch.set(userDoc.ref, {
        points: {
          weekly: 0,
        },
        weeklyPointsResetAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      opCount += 1;
      updatedUsers += 1;

      if (opCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    cursor = usersSnap.docs[usersSnap.docs.length - 1];
  }

  if (opCount > 0) {
    await batch.commit();
  }

  await db.collection('systemJobs').doc('weeklyLeaderboardReset').set({
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedUsers: updatedUsers,
  }, { merge: true });

  return { updatedUsers };
}
