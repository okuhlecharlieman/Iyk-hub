import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/logging';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:payouts:list', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const db = admin.firestore();

    // Get all approved sponsored challenges with successful payments
    const challengesSnap = await db.collection('sponsoredChallengeOrders')
      .where('status', '==', 'approved')
      .get();

    const payouts = [];

    for (const challengeDoc of challengesSnap.docs) {
      const challenge = { id: challengeDoc.id, ...challengeDoc.data() };

      // Check if payment was successful
      const paymentLogSnap = await db.collection('paymentLogs')
        .where('orderType', '==', 'sponsoredChallenge')
        .where('orderId', '==', challenge.id)
        .where('status', '==', 'succeeded')
        .limit(1)
        .get();

      if (!paymentLogSnap.empty) {
        const paymentLog = { id: paymentLogSnap.docs[0].id, ...paymentLogSnap.docs[0].data() };

        // Check if payout already exists
        const existingPayoutSnap = await db.collection('payouts')
          .where('challengeId', '==', challenge.id)
          .limit(1)
          .get();

        const payoutAmountCents = challenge.budgetCents - (challenge.platformFeeCents || Math.round(challenge.budgetCents * 0.2));

        if (existingPayoutSnap.empty) {
          // Create pending payout
          payouts.push({
            id: `payout_${challenge.id}`,
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            sponsorName: challenge.sponsorName,
            sponsorEmail: challenge.sponsorEmail,
            amountCents: payoutAmountCents,
            status: 'pending',
            createdAt: challenge.approvedAt || challenge.createdAt,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          });
        } else {
          // Existing payout
          const existingPayout = { id: existingPayoutSnap.docs[0].id, ...existingPayoutSnap.docs[0].data() };
          payouts.push({
            id: existingPayout.id,
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            sponsorName: challenge.sponsorName,
            sponsorEmail: challenge.sponsorEmail,
            amountCents: payoutAmountCents,
            status: existingPayout.status,
            processedAt: existingPayout.processedAt,
            createdAt: challenge.approvedAt || challenge.createdAt,
            dueDate: existingPayout.dueDate,
          });
        }
      }
    }

    // Sort by creation date, newest first
    payouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:payouts:process', limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const user = await AuthMiddleware.requireAdmin(request);

    const payload = await request.json();
    const { challengeId, payoutMethod = 'bank_transfer' } = payload;

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const db = admin.firestore();

    // Get challenge details
    const challengeSnap = await db.collection('sponsoredChallengeOrders').doc(challengeId).get();
    if (!challengeSnap.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challenge = challengeSnap.data();

    // Verify payment was successful
    const paymentLogSnap = await db.collection('paymentLogs')
      .where('orderType', '==', 'sponsoredChallenge')
      .where('orderId', '==', challengeId)
      .where('status', '==', 'succeeded')
      .limit(1)
      .get();

    if (paymentLogSnap.empty) {
      return NextResponse.json({ error: 'No successful payment found for this challenge' }, { status: 400 });
    }

    // Check if payout already exists
    const existingPayoutSnap = await db.collection('payouts')
      .where('challengeId', '==', challengeId)
      .limit(1)
      .get();

    if (!existingPayoutSnap.empty) {
      return NextResponse.json({ error: 'Payout already processed for this challenge' }, { status: 400 });
    }

    // Calculate payout amount
    const platformFeeCents = challenge.platformFeeCents || Math.round(challenge.budgetCents * 0.2);
    const payoutAmountCents = challenge.budgetCents - platformFeeCents;

    // Create payout record
    const payoutRef = await db.collection('payouts').add({
      challengeId,
      sponsorName: challenge.sponsorName,
      sponsorEmail: challenge.sponsorEmail,
      amountCents: payoutAmountCents,
      currency: 'ZAR',
      status: 'processed',
      payoutMethod,
      processedBy: uid,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log admin action
    await logAdminAction({
      request,
      actor: user,
      action: 'payout.processed',
      targetType: 'sponsoredChallenge',
      targetId: challengeId,
      details: {
        payoutId: payoutRef.id,
        amountCents: payoutAmountCents,
        payoutMethod,
      },
    });

    return NextResponse.json({
      success: true,
      payoutId: payoutRef.id,
      amountCents: payoutAmountCents,
      message: 'Payout processed successfully',
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}