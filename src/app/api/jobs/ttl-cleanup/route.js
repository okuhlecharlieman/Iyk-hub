import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase-admin';
import { isAuthorizedCron } from '../../../../lib/api/cron-auth';
import { logAdminAction } from '../../../../lib/api/audit-log';

const BATCH_DELETE_LIMIT = 400;

async function batchDelete(query, results, collectionName) {
  let deletedCount = 0;
  let snapshot;
  do {
    snapshot = await query.limit(BATCH_DELETE_LIMIT).get();
    if (snapshot.empty) break;

    const batch = db.batch();
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
    // ... (batchDelete logic remains the same) ...

    // 5. Clean health check pings (temporary document)
    const healthcheckRef = db.collection('_healthcheck').doc('ping');
    const healthcheckDoc = await healthcheckRef.get();
    if (healthcheckDoc.exists) {
      await healthcheckRef.delete();
      results['_healthcheck'] = { deleted: 1 };
    }

    // Log the cleanup action
    await logAdminAction({
        request,
        actor: { uid: 'system:cron', email: 'System (Cron Job)' },
        action: 'system.ttl.cleanup',
        targetType: 'system',
        targetId: 'ttl-cleanup',
        metadata: results,
    });

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
