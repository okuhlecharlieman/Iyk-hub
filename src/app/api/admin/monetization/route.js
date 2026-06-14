import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getDateRange } from '../../../../lib/api/date-range';
export const dynamic = 'force-dynamic';

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

    console.log(`[Monetization API] Fetching data for period: ${period}, range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

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
    const creatorBoosts = creatorBoostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sponsoredChallenges = sponsoredChallengesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const institutions = institutionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`[Monetization API] Found ${paymentLogs.length} payment logs, ${payments.length} payments, ${creatorBoosts.length} boost orders`);

    // Merge all payment sources to calculate summary metrics
    // 1. Payment logs with status 'succeeded'
    const successfulFromLogs = paymentLogs.filter(p => p.status === 'succeeded');
    // 2. Payments collection with status 'succeeded' or 'paid'
    const successfulFromPayments = payments.filter(p => p.status === 'succeeded' || p.status === 'paid');
    // 3. Creator boost orders with paymentStatus 'paid'
    const paidBoosts = creatorBoosts.filter(o => o.paymentStatus === 'paid');
    // 4. Sponsored challenge orders with paymentStatus 'paid'
    const paidChallenges = sponsoredChallenges.filter(o => o.paymentStatus === 'paid');

    // Deduplicate by tracking seen order IDs
    const seenIds = new Set();
    const allSuccessful = [];

    for (const p of successfulFromLogs) {
      const key = p.orderId || p.id;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allSuccessful.push(p);
      }
    }
    for (const p of successfulFromPayments) {
      const key = p.orderId || p.id;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allSuccessful.push({
          ...p,
          customerId: p.customerId || p.userId || p.email,
        });
      }
    }
    for (const o of paidBoosts) {
      if (!seenIds.has(o.id)) {
        seenIds.add(o.id);
        allSuccessful.push({
          id: o.id,
          orderType: 'creatorBoost',
          amountCents: o.feeCents || o.amountCents || 0,
          customerId: o.userId || o.email,
          status: 'succeeded',
        });
      }
    }
    for (const o of paidChallenges) {
      if (!seenIds.has(o.id)) {
        seenIds.add(o.id);
        allSuccessful.push({
          id: o.id,
          orderType: 'sponsoredChallenge',
          amountCents: o.feeCents || o.amountCents || o.budgetCents || 0,
          customerId: o.userId || o.sponsorEmail,
          status: 'succeeded',
        });
      }
    }

    const totalRevenueCents = allSuccessful.reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const uniqueCustomers = new Set(allSuccessful.map(p => p.customerId).filter(Boolean)).size;
    const averageTransactionCents = allSuccessful.length > 0
      ? totalRevenueCents / allSuccessful.length
      : 0;
    const totalDonationRevenueCents = allSuccessful
      .filter((p) => (p.orderType || '').toLowerCase() === 'donation')
      .reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const donationCount = allSuccessful.filter((p) => (p.orderType || '').toLowerCase() === 'donation').length;

    // Revenue by type
    const revenueByType = {};
    allSuccessful.forEach(payment => {
      const type = payment.orderType || 'unknown';
      if (!revenueByType[type]) {
        revenueByType[type] = { type, revenueCents: 0, count: 0 };
      }
      revenueByType[type].revenueCents += payment.amountCents || 0;
      revenueByType[type].count += 1;
    });

    const revenueByTypeArray = Object.values(revenueByType).sort((a, b) => b.revenueCents - a.revenueCents);

    const downloadsDoc = await db.collection('appStats').doc('downloads').get();
    const totalDownloads = downloadsDoc.exists ? downloadsDoc.data()?.count || 0 : 0;

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
          const platformFeeCents = challenge.platformFeeWaived ? 0 : (challenge.platformFeeCents || Math.round(challenge.budgetCents * 0.2));
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
      successfulPayments: allSuccessful.length,
      uniqueCustomers,
      averageTransactionCents,
      totalDonationRevenueCents: totalDonationRevenueCents || 0,
      donationCount: donationCount || 0,
      totalDownloads: totalDownloads || 0,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    console.log(`[Monetization API] Summary: Revenue=${(totalRevenueCents/100).toFixed(2)}, Downloads=${totalDownloads}, Donations=${(totalDonationRevenueCents/100).toFixed(2)}`);

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