import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'account:restore', limit: 5, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    if (!userData.deletionScheduledAt || userData.deletionCancelled) {
      return NextResponse.json({ error: 'No pending deletion to cancel' }, { status: 400 });
    }

    const snapshot = userData._preDeletionSnapshot || {};
    await userRef.set({
      deletionCancelled: true,
      deletionCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      accountStatus: 'active',
      deletionScheduledAt: admin.firestore.FieldValue.delete(),
      scheduledPurgeAt: admin.firestore.FieldValue.delete(),
      _preDeletionSnapshot: admin.firestore.FieldValue.delete(),
      ...(snapshot.displayName && { displayName: snapshot.displayName }),
      ...(snapshot.bio && { bio: snapshot.bio }),
      ...(snapshot.skills?.length && { skills: snapshot.skills }),
      ...(snapshot.photoURL && { photoURL: snapshot.photoURL }),
      ...(snapshot.email && { email: snapshot.email }),
    }, { merge: true });

    await db.collection('auditLogs').add({
      action: 'account_deletion_cancelled',
      targetUid: uid,
      initiatedBy: uid,
      initiatorType: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Account deletion cancelled. Your account has been restored.',
    });
  } catch (error) {
    return handleApiError(error, 'Error restoring account:');
  }
}
