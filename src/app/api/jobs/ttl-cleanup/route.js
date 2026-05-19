import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';

export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();
    const now = Date.now();
    const results = { rateLimits: 0, expiredSessions: 0, staleModeration: 0 };

    const rlSnap = await db.collection('rateLimits')
      .where('resetAt', '<', now)
      .limit(500)
      .get();

    if (!rlSnap.empty) {
      const batches = [];
      let batch = db.batch();
      let count = 0;
      for (const doc of rlSnap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count % 500 === 0) {
          batches.push(batch);
          batch = db.batch();
        }
      }
      batches.push(batch);
      await Promise.all(batches.map((b) => b.commit()));
      results.rateLimits = rlSnap.size;
    }

    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const staleModSnap = await db.collection('moderationQueue')
      .where('status', '==', 'resolved')
      .where('resolvedAt', '<', thirtyDaysAgo)
      .limit(500)
      .get();

    if (!staleModSnap.empty) {
      const batch = db.batch();
      for (const doc of staleModSnap.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      results.staleModeration = staleModSnap.size;
    }

    const healthcheckRef = db.collection('_healthcheck').doc('ping');
    const hcSnap = await healthcheckRef.get();
    if (hcSnap.exists) {
      await healthcheckRef.delete();
    }

    return NextResponse.json({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TTL cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
