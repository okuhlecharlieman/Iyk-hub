import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../../lib/api/logging';

export async function POST(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:sponsored-challenges:approve', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const user = await AuthMiddleware.requireAdmin(request);

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
    }

    const db = admin.firestore();
    const challengeRef = db.collection('sponsoredChallenges').doc(id);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challenge = challengeSnap.data();
    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'Challenge is not pending approval' }, { status: 400 });
    }

    // Calculate platform fee (e.g., 20% of budget)
    const platformFeeCents = Math.round(challenge.budgetCents * 0.2);
    const sponsorAmountCents = challenge.budgetCents - platformFeeCents;

    // Update challenge status
    await challengeRef.update({
      status: 'approved',
      approvedBy: uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      platformFeeCents,
      sponsorAmountCents,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log admin action
    await logAdminAction({
      request,
      actor: user,
      action: 'challenge.approved',
      targetType: 'sponsoredChallenge',
      targetId: id,
      details: { platformFeeCents, sponsorAmountCents },
    });

    return NextResponse.json({ success: true, platformFeeCents, sponsorAmountCents });
  } catch (error) {
    console.error('Error approving sponsored challenge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}