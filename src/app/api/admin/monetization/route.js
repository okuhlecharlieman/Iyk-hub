import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

function getDateRange(period) {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate: now };
}

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:monetization', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    await AuthMiddleware.requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const { startDate, endDate } = getDateRange(period);

    const db = admin.firestore();

    // Fetch payment logs within date range
    const paymentLogsQuery = db.collection('paymentLogs')
      .where('processedAt', '>=', startDate)
      .where('processedAt', '<=', endDate)
      .orderBy('processedAt', 'desc')
      .limit(1000);

    const [paymentLogsSnap, paymentsSnap, sponsoredChallengesSnap, creatorBoostsSnap, institutionsSnap] = await Promise.all([
      paymentLogsQuery.get(),
      db.collection('payments').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('sponsoredChallengeOrders').get(),
      db.collection('creatorBoostOrders').get(),
      db.collection('institutionAccounts').get(),
    ]);

    const paymentLogs = paymentLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate summary metrics
    const successfulPayments = paymentLogs.filter(p => p.status === 'succeeded');
    const totalRevenueCents = successfulPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const uniqueCustomers = new Set(successfulPayments.map(p => p.customerId)).size;
    const averageTransactionCents = successfulPayments.length > 0
      ? totalRevenueCents / successfulPayments.length
      : 0;

    // Revenue by type
    const revenueByType = {};
    successfulPayments.forEach(payment => {
      const type = payment.orderType || 'unknown';
      if (!revenueByType[type]) {
        revenueByType[type] = { type, revenueCents: 0, count: 0 };
      }
      revenueByType[type].revenueCents += payment.amountCents || 0;
      revenueByType[type].count += 1;
    });

    const revenueByTypeArray = Object.values(revenueByType).sort((a, b) => b.revenueCents - a.revenueCents);

    // Recent payments (last 20)
    const recentPayments = payments.slice(0, 20).map(payment => ({
      id: payment.id,
      orderType: payment.orderType,
      orderId: payment.orderId,
      amountCents: payment.amountCents,
      status: payment.status,
      createdAt: payment.createdAt?.toDate?.()?.toISOString() || payment.createdAt,
    }));

    // Pending payouts - sponsors who have completed challenges and are due payment
    const pendingPayouts = [];

    // Check sponsored challenges for completed ones that need payouts
    const sponsoredChallenges = sponsoredChallengesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    for (const challenge of sponsoredChallenges) {
      if (challenge.status === 'approved' && challenge.stripePaymentIntentId) {
        // Check if payment was successful
        const paymentLog = paymentLogs.find(p =>
          p.orderType === 'sponsoredChallenge' &&
          p.orderId === challenge.id &&
          p.status === 'succeeded'
        );

        if (paymentLog) {
          // Calculate payout amount (challenge budget minus platform fee)
          const platformFeeCents = challenge.platformFeeCents || Math.round(challenge.budgetCents * 0.2);
          const payoutAmountCents = challenge.budgetCents - platformFeeCents;

          // Check if payout has been processed (this would need a payouts collection in real implementation)
          // For now, assume all successful payments need payouts
          pendingPayouts.push({
            id: challenge.id,
            sponsorName: challenge.sponsorName,
            challengeTitle: challenge.title,
            amountCents: payoutAmountCents,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            status: 'pending',
          });
        }
      }
    }

    const summary = {
      totalRevenueCents,
      successfulPayments: successfulPayments.length,
      uniqueCustomers,
      averageTransactionCents,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return NextResponse.json({
      summary,
      revenueByType: revenueByTypeArray,
      recentPayments,
      pendingPayouts: pendingPayouts.slice(0, 10), // Limit to 10 for UI
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching monetization data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}