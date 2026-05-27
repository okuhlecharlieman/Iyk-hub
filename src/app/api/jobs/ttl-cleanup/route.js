import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';
import { logAdminAction } from '../../../../lib/api/audit-log';

const BATCH_DELETE_LIMIT = 400;

async function batchDelete(firestore, query, results, collectionName) {
  let deletedCount = 0;
  let snapshot;
  do {
    snapshot = await query.limit(BATCH_DELETE_LIMIT).get();
    if (snapshot.empty) break;

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    deletedCount += snapshot.size;
  } while (snapshot.size >= BATCH_DELETE_LIMIT);

  if (deletedCount > 0) {
    results[collectionName] = { deleted: deletedCount };
  }
}

export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const results = {};

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    // 1. Clean expired rate limits (older than 24 hours)
    const rateLimitsQuery = db.collection('rateLimits').where('timestamp', '<', twentyFourHoursAgo);
    await batchDelete(db, rateLimitsQuery, results, 'rateLimits');

    // 2. Clean resolved moderation items (older than 30 days)
    const moderationQuery = db.collection('moderationQueue').where('resolved', '==', true).where('resolvedAt', '<', thirtyDaysAgo);
    await batchDelete(db, moderationQuery, results, 'moderationQueue');

    // 3. Clean old daily quotes (older than 24 hours)
    const quotesQuery = db.collection('dailyQuotes').where('createdAt', '<', twentyFourHoursAgo);
    await batchDelete(db, quotesQuery, results, 'dailyQuotes');

    // 4. Clean stale video chat rooms (not updated in 24 hours)
    const videoRoomsQuery = db.collection('videoChatRooms').where('updatedAt', '<', twentyFourHoursAgo);
    await batchDelete(db, videoRoomsQuery, results, 'videoChatRooms');

    // 5. Clean health check pings (temporary document)
    const healthcheckRef = db.collection('_healthcheck').doc('ping');
    const healthcheckDoc = await healthcheckRef.get();
    if (healthcheckDoc.exists) {
      await healthcheckRef.delete();
      results['_healthcheck'] = { deleted: 1 };
    }

    // 6. Purge accounts past the 30-day cooling-off period
    const expiredAccountsSnap = await db.collection('users')
      .where('accountStatus', '==', 'pending_deletion')
      .where('scheduledPurgeAt', '<=', now)
      .limit(50)
      .get();

    let purgedCount = 0;
    for (const userDoc of expiredAccountsSnap.docs) {
      const uid = userDoc.id;
      try {
        // Reassign showcase posts to "Deleted User"
        const postsSnap = await db.collection('wallPosts').where('uid', '==', uid).get();
        if (!postsSnap.empty) {
          const batch = db.batch();
          postsSnap.docs.forEach((postDoc) => {
            batch.update(postDoc.ref, {
              uid: 'deleted',
              authorName: 'Deleted User',
              authorPhotoURL: null,
            });
          });
          await batch.commit();
        }

        // Soft-delete user document
        await userDoc.ref.set({
          accountStatus: 'purged',
          purgedAt: admin.firestore.FieldValue.serverTimestamp(),
          displayName: 'Deleted User',
          bio: '',
          skills: [],
          photoURL: null,
          email: null,
          activeBoost: admin.firestore.FieldValue.delete(),
        }, { merge: true });

        // Delete Firebase Auth user
        try {
          await admin.auth().deleteUser(uid);
        } catch (authErr) {
          if (authErr?.code !== 'auth/user-not-found') {
            console.error(`Error deleting auth for ${uid}:`, authErr);
          }
        }

        purgedCount++;
      } catch (purgeErr) {
        console.error(`Error purging user ${uid}:`, purgeErr);
      }
    }
    if (purgedCount > 0) {
      results['accountsPurged'] = { deleted: purgedCount };
    }

    // Log the cleanup action
    if (Object.keys(results).length > 0) {
        await logAdminAction({
            request,
            actor: { uid: 'system:cron', email: 'System (Cron Job)' },
            action: 'system.ttl.cleanup',
            targetType: 'system',
            targetId: 'ttl-cleanup',
            metadata: results,
        });
    }

    return NextResponse.json({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TTL cleanup error:', error);
    // Also log the error to the admin log
    await logAdminAction({
        request,
        actor: { uid: 'system:cron', email: 'System (Cron Job)' },
        action: 'system.ttl.cleanup',
        targetType: 'system',
        targetId: 'ttl-cleanup',
        status: 'failed',
        errorMessage: error?.message || 'Unknown error',
    });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
