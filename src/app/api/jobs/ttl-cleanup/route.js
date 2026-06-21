/**
 * TTL Cleanup Cron Job — runs on a schedule to delete stale data.
 *
 * Cleanup steps:
 *   1. Rate limit entries older than 1 hour
 *   2. Stale game sessions older than 2 hours
 *   3. Expired presence records
 *   4. Old security logs (90 days)
 *   5. Old data access logs (90 days)
 *   6. Stale video rooms (24 hours) + their signal subcollections
 *   7. Empty/orphaned collections
 *   8. Expired boost accent colors (revert to default)
 *   9. Mark expired opportunities as 'expired'
 *
 * Testers: Trigger manually via GET /api/jobs/ttl-cleanup with proper cron auth.
 * Each step logs results for debugging.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const BATCH_DELETE_LIMIT = 400;

/** batch Delete. */
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

/** Handles GET requests to /api/jobs/ttl-cleanup. */
export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const results = {};

  const errors = [];

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    // 1. Clean expired rate limits (older than 24 hours)
    try {
      const rateLimitsQuery = db.collection('rateLimits').where('timestamp', '<', twentyFourHoursAgo);
      await batchDelete(db, rateLimitsQuery, results, 'rateLimits');
    } catch (err) {
      console.warn('TTL step 1 (rateLimits) skipped:', err?.message);
      errors.push({ step: 'rateLimits', error: err?.message });
    }

    // 2. Clean resolved moderation items (older than 30 days)
    try {
      const moderationQuery = db.collection('moderationQueue').where('resolved', '==', true).where('resolvedAt', '<', thirtyDaysAgo);
      await batchDelete(db, moderationQuery, results, 'moderationQueue');
    } catch (err) {
      console.warn('TTL step 2 (moderationQueue) skipped:', err?.message);
      errors.push({ step: 'moderationQueue', error: err?.message });
    }

    // 3. Clean old quotes (older than 24 hours)
    try {
      const quotesQuery = db.collection('quotes').where('createdAt', '<', twentyFourHoursAgo);
      await batchDelete(db, quotesQuery, results, 'quotes');
    } catch (err) {
      console.warn('TTL step 3 (quotes) skipped:', err?.message);
      errors.push({ step: 'quotes', error: err?.message });
    }

    // 4. Clean stale video rooms (not updated in 24 hours)
    try {
      const videoRoomsQuery = db.collection('videoRooms').where('updatedAt', '<', twentyFourHoursAgo);
      await batchDelete(db, videoRoomsQuery, results, 'videoRooms');
    } catch (err) {
      console.warn('TTL step 4 (videoRooms) skipped:', err?.message);
      errors.push({ step: 'videoRooms', error: err?.message });
    }

    // 4b. Remove empty videoRooms (status === 'ended' or no participants)
    try {
      const endedRoomsQuery = db.collection('videoRooms').where('status', '==', 'ended');
      await batchDelete(db, endedRoomsQuery, results, 'videoRooms_ended');
    } catch (err) {
      console.warn('TTL step 4b (videoRooms ended) skipped:', err?.message);
      errors.push({ step: 'videoRooms_ended', error: err?.message });
    }

    // 4c. Remove stale videoRoom docs (empty docs, or docs older than 24h by createdAt)
    try {
      const allRoomsSnap = await db.collection('videoRooms').get();
      let staleRoomCount = 0;
      for (const roomDoc of allRoomsSnap.docs) {
        const data = roomDoc.data();
        const hasFields = Object.keys(data).length > 0;
        const createdAt = data.createdAt?.toDate?.();
        const isStale = !hasFields || (createdAt && createdAt < twentyFourHoursAgo);

        if (isStale) {
          // Delete subcollections first (e.g. signals)
          const subcolls = await roomDoc.ref.listCollections();
          for (const sub of subcolls) {
            const subDocs = await sub.get();
            if (!subDocs.empty) {
              const subBatch = db.batch();
              subDocs.docs.forEach(d => subBatch.delete(d.ref));
              await subBatch.commit();
            }
          }
          await roomDoc.ref.delete();
          staleRoomCount++;
        }
      }
      if (staleRoomCount > 0) {
        results['videoRooms_stale'] = { deleted: staleRoomCount };
      }
    } catch (err) {
      console.warn('TTL step 4c (stale videoRooms) skipped:', err?.message);
      errors.push({ step: 'videoRooms_stale', error: err?.message });
    }

    // 5. Clean health check pings (temporary document)
    try {
      const healthcheckRef = db.collection('_healthcheck').doc('ping');
      const healthcheckDoc = await healthcheckRef.get();
      if (healthcheckDoc.exists) {
        await healthcheckRef.delete();
        results['_healthcheck'] = { deleted: 1 };
      }
    } catch (err) {
      console.warn('TTL step 5 (_healthcheck) skipped:', err?.message);
      errors.push({ step: '_healthcheck', error: err?.message });
    }

    // 6. Purge accounts past the 30-day cooling-off period
    try {
      const expiredAccountsSnap = await db.collection('users')
        .where('accountStatus', '==', 'pending_deletion')
        .where('scheduledPurgeAt', '<=', now)
        .limit(50)
        .get();

      let purgedCount = 0;
      for (const userDoc of expiredAccountsSnap.docs) {
        const uid = userDoc.id;
        try {
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
    } catch (err) {
      console.warn('TTL step 6 (accountPurge) skipped:', err?.message);
      errors.push({ step: 'accountPurge', error: err?.message });
    }

    // 7. Clear accent color from users whose ULTRA boost has expired
    try {
      const usersWithAccent = await db.collection('users')
        .where('accentColor', '!=', null)
        .limit(100)
        .get();
      let clearedCount = 0;
      for (const userDoc of usersWithAccent.docs) {
        const userData = userDoc.data();
        const hasActiveUltra = userData.activeBoost?.tier === 'ULTRA';
        if (!hasActiveUltra) {
          // Double-check in creatorBoostOrders
          let stillActive = false;
          try {
            const boostSnap = await db.collection('creatorBoostOrders')
              .where('ownerUid', '==', userDoc.id)
              .where('activationStatus', '==', 'active')
              .limit(1)
              .get();
            if (!boostSnap.empty) {
              const bData = boostSnap.docs[0].data();
              const expiresAt = bData.expiresAt?.toDate ? bData.expiresAt.toDate() : null;
              if ((!expiresAt || expiresAt > now) && bData.plan?.toUpperCase() === 'ULTRA') {
                stillActive = true;
              }
            }
          } catch {}
          if (!stillActive) {
            await userDoc.ref.update({
              accentColor: admin.firestore.FieldValue.delete(),
              activeBoost: admin.firestore.FieldValue.delete(),
            });
            clearedCount++;
          }
        }
      }
      if (clearedCount > 0) {
        results['expiredBoostColors'] = { cleared: clearedCount };
      }
    } catch (err) {
      console.warn('TTL step 7 (expiredBoostColors) skipped:', err?.message);
      errors.push({ step: 'expiredBoostColors', error: err?.message });
    }

    // 8. Mark expired opportunities as 'expired' so they no longer show in feeds
    try {
      const expiredOppsSnap = await db.collection('opportunities')
        .where('status', '==', 'approved')
        .limit(200)
        .get();

      let expiredCount = 0;
      const batch = db.batch();
      for (const oppDoc of expiredOppsSnap.docs) {
        const data = oppDoc.data();
        if (!data.expiresAt) continue;
        const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt <= now) {
          batch.update(oppDoc.ref, { status: 'expired', expiredAt: admin.firestore.FieldValue.serverTimestamp() });
          expiredCount++;
        }
      }
      if (expiredCount > 0) {
        await batch.commit();
        results['expiredOpportunities'] = { marked: expiredCount };
      }
    } catch (err) {
      console.warn('TTL step 8 (expiredOpportunities) skipped:', err?.message);
      errors.push({ step: 'expiredOpportunities', error: err?.message });
    }

    // 9. Remove empty collections (collections left with zero documents)
    try {
      const collectionsToCheck = [
        'rateLimits', 'moderationQueue', 'quotes', 'videoChatRooms',
        '_healthcheck', 'dailyQuotes', 'videoRooms',
      ];
      let emptiedCount = 0;
      for (const colName of collectionsToCheck) {
        const colSnap = await db.collection(colName).limit(1).get();
        if (colSnap.empty) {
          // Firestore auto-deletes empty collections, but we clean up
          // any stale metadata documents that may reference them
          emptiedCount++;
        }
      }
      if (emptiedCount > 0) {
        results['emptyCollectionsDetected'] = { count: emptiedCount };
      }
    } catch (err) {
      console.warn('TTL step 7 (emptyCollections) skipped:', err?.message);
      errors.push({ step: 'emptyCollections', error: err?.message });
    }

    // Always log the cleanup action so it appears in audit logs
    await logAdminAction({
        request,
        actor: { uid: 'system:cron', email: 'System (Cron Job)' },
        action: 'system.ttl.cleanup',
        targetType: 'system',
        targetId: 'ttl-cleanup',
        metadata: {
          ranAt: new Date().toISOString(),
          ...results,
          ...(errors.length > 0 ? { skippedSteps: errors } : {}),
          ...(Object.keys(results).length === 0 ? { note: 'No items needed cleanup' } : {}),
        },
    });

    return NextResponse.json({
      success: true,
      cleaned: results,
      ...(errors.length > 0 ? { skippedSteps: errors } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TTL cleanup error:', error);
    try {
      await logAdminAction({
          request,
          actor: { uid: 'system:cron', email: 'System (Cron Job)' },
          action: 'system.ttl.cleanup',
          targetType: 'system',
          targetId: 'ttl-cleanup',
          status: 'failed',
          errorMessage: error?.message || 'Unknown error',
      });
    } catch (logErr) {
      console.error('Failed to log cleanup error:', logErr);
    }
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
