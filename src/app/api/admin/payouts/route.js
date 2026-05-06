import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/logging';
import { PAYOUT_STATUSES, LEDGER_ENTRY_TYPES } from '../../../../lib/monetization/constants';
import { appendLedgerEntry } from '../../../../lib/monetization/ledger';

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

      const paymentLogSnap = await db.collection('paymentLogs')
        .where('orderType', '==', 'sponsoredChallenge')
        .where('orderId', '==', challenge.id)
        .where('status', '==', 'succeeded')
        .limit(1)
        .get();

      if (!paymentLogSnap.empty) {
        const existingPayoutSnap = await db.collection('payouts')
          .where('challengeId', '==', challenge.id)
          .limit(1)
          .get();

        const payoutAmountCents = challenge.budgetCents - (challenge.platformFeeCents || Math.round(challenge.budgetCents * 0.2));

        if (existingPayoutSnap.empty) {
          payouts.push({
            id: `payout_${challenge.id}`,
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            sponsorName: challenge.sponsorName,
            sponsorEmail: challenge.sponsorEmail,
            amountCents: payoutAmountCents,
            status: PAYOUT_STATUSES.PENDING,
            createdAt: challenge.approvedAt || challenge.createdAt,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } else {
          const existingPayout = { id: existingPayoutSnap.docs[0].id, ...existingPayoutSnap.docs[0].data() };
          payouts.push({
            id: existingPayout.id,
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            sponsorName: challenge.sponsorName,
            sponsorEmail: challenge.sponsorEmail,
            amountCents: payoutAmountCents,
            status: existingPayout.status,
            approvedBy: existingPayout.approvedBy || null,
            approvedAt: existingPayout.approvedAt || null,
            processedAt: existingPayout.processedAt,
            providerPayoutId: existingPayout.providerPayoutId || null,
            createdAt: challenge.approvedAt || challenge.createdAt,
            dueDate: existingPayout.dueDate,
          });
        }
      }
    }

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
    const { challengeId, action = 'approve', payoutMethod = 'bank_transfer', providerPayoutId = null } = payload;

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const db = admin.firestore();

    const challengeSnap = await db.collection('sponsoredChallengeOrders').doc(challengeId).get();
    if (!challengeSnap.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challenge = challengeSnap.data();

    const paymentLogSnap = await db.collection('paymentLogs')
      .where('orderType', '==', 'sponsoredChallenge')
      .where('orderId', '==', challengeId)
      .where('status', '==', 'succeeded')
      .limit(1)
      .get();

    if (paymentLogSnap.empty) {
      return NextResponse.json({ error: 'No successful payment found for this challenge' }, { status: 400 });
    }

    const platformFeeCents = challenge.platformFeeCents || Math.round(challenge.budgetCents * 0.2);
    const payoutAmountCents = challenge.budgetCents - platformFeeCents;

    // Check for existing payout
    const existingPayoutSnap = await db.collection('payouts')
      .where('challengeId', '==', challengeId)
      .limit(1)
      .get();

    if (action === 'approve') {
      if (!existingPayoutSnap.empty) {
        const existing = existingPayoutSnap.docs[0].data();
        if (existing.status !== PAYOUT_STATUSES.PENDING) {
          return NextResponse.json({ error: `Payout already ${existing.status}` }, { status: 400 });
        }
        // Update existing to approved
        await existingPayoutSnap.docs[0].ref.update({
          status: PAYOUT_STATUSES.APPROVED,
          approvedBy: uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Create new payout in approved state
        await db.collection('payouts').add({
          challengeId,
          sponsorName: challenge.sponsorName,
          sponsorEmail: challenge.sponsorEmail,
          amountCents: payoutAmountCents,
          currency: 'ZAR',
          status: PAYOUT_STATUSES.APPROVED,
          payoutMethod,
          approvedBy: uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await appendLedgerEntry(db, {
        entryType: LEDGER_ENTRY_TYPES.PAYOUT_SCHEDULED,
        orderType: 'sponsoredChallenge',
        orderId: challengeId,
        amountCents: payoutAmountCents,
        description: `Payout approved for challenge ${challengeId}`,
      });

      await logAdminAction({
        request,
        actor: user,
        action: 'payout.approved',
        targetType: 'sponsoredChallenge',
        targetId: challengeId,
        details: { amountCents: payoutAmountCents, payoutMethod },
      });

      return NextResponse.json({
        success: true,
        status: PAYOUT_STATUSES.APPROVED,
        amountCents: payoutAmountCents,
        message: 'Payout approved. Ready for processing.',
      });
    }

    if (action === 'process') {
      if (existingPayoutSnap.empty) {
        return NextResponse.json({ error: 'Payout must be approved before processing' }, { status: 400 });
      }

      const existing = existingPayoutSnap.docs[0].data();
      if (existing.status !== PAYOUT_STATUSES.APPROVED) {
        return NextResponse.json({ error: `Payout must be approved first. Current status: ${existing.status}` }, { status: 400 });
      }

      await existingPayoutSnap.docs[0].ref.update({
        status: PAYOUT_STATUSES.PAID,
        processedBy: uid,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        providerPayoutId: providerPayoutId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await appendLedgerEntry(db, {
        entryType: LEDGER_ENTRY_TYPES.PAYOUT_PAID,
        orderType: 'sponsoredChallenge',
        orderId: challengeId,
        amountCents: payoutAmountCents,
        description: `Payout processed for challenge ${challengeId}`,
        metadata: { providerPayoutId },
      });

      await logAdminAction({
        request,
        actor: user,
        action: 'payout.processed',
        targetType: 'sponsoredChallenge',
        targetId: challengeId,
        details: {
          payoutId: existingPayoutSnap.docs[0].id,
          amountCents: payoutAmountCents,
          payoutMethod,
          providerPayoutId,
        },
      });

      return NextResponse.json({
        success: true,
        status: PAYOUT_STATUSES.PAID,
        payoutId: existingPayoutSnap.docs[0].id,
        amountCents: payoutAmountCents,
        message: 'Payout processed successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "approve" or "process".' }, { status: 400 });
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
