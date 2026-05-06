import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:alerts:list', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const db = admin.firestore();
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || null;
    const acknowledged = searchParams.get('acknowledged');
    const limitCount = Math.min(Number(searchParams.get('limit')) || 50, 200);

    let query = db.collection('systemAlerts').orderBy('createdAt', 'desc');

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    if (acknowledged === 'false') {
      query = query.where('acknowledged', '==', false);
    }

    query = query.limit(limitCount);

    const snap = await query.get();
    const alerts = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:alerts:ack', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const { alertId } = await request.json();
    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    const db = admin.firestore();
    await db.collection('systemAlerts').doc(alertId).update({
      acknowledged: true,
      acknowledgedBy: uid,
      acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
