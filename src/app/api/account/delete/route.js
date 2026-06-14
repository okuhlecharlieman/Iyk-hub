import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

const COOLING_OFF_DAYS = 30;

export async function DELETE(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'account:delete', limit: 5, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : {};

    if (userData.deletionScheduledAt && !userData.deletionCancelled) {
      return NextResponse.json({
        error: 'Account is already scheduled for deletion.',
        scheduledPurgeAt: userData.scheduledPurgeAt,
      }, { status: 409 });
    }

    const now = new Date();
    const purgeDate = new Date(now.getTime() + COOLING_OFF_DAYS * 24 * 60 * 60 * 1000);

    await userRef.set({
      deletionScheduledAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledPurgeAt: purgeDate,
      deletionCancelled: false,
      accountStatus: 'pending_deletion',
      _preDeletionSnapshot: {
        displayName: userData.displayName || null,
        bio: userData.bio || null,
        skills: userData.skills || [],
        photoURL: userData.photoURL || null,
        email: userData.email || null,
      },
    }, { merge: true });

    await db.collection('auditLogs').add({
      action: 'account_deletion_scheduled',
      targetUid: uid,
      initiatedBy: uid,
      initiatorType: 'user',
      reason: 'User-initiated account deletion',
      scheduledPurgeAt: purgeDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Account scheduled for deletion. You have ${COOLING_OFF_DAYS} days to restore your account by logging back in.`,
      scheduledPurgeAt: purgeDate.toISOString(),
      coolingOffDays: COOLING_OFF_DAYS,
    });
  } catch (error) {
    return handleApiError(error, 'Error scheduling account deletion:');
  }
}
