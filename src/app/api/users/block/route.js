import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'users:block', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const { targetUid } = await request.json();

    if (!targetUid || typeof targetUid !== 'string') {
      return NextResponse.json({ error: 'targetUid is required' }, { status: 400 });
    }

    if (targetUid === uid) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const db = admin.firestore();
    await db.collection('users').doc(uid).set({
      blockedUsers: admin.firestore.FieldValue.arrayUnion(targetUid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, blocked: true });
  } catch (error) {
    return handleApiError(error, 'Error blocking user:');
  }
}

export async function DELETE(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'users:unblock', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const { searchParams } = new URL(request.url);
    const targetUid = searchParams.get('targetUid');

    if (!targetUid) {
      return NextResponse.json({ error: 'targetUid is required' }, { status: 400 });
    }

    const db = admin.firestore();
    await db.collection('users').doc(uid).set({
      blockedUsers: admin.firestore.FieldValue.arrayRemove(targetUid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, blocked: false });
  } catch (error) {
    return handleApiError(error, 'Error unblocking user:');
  }
}
