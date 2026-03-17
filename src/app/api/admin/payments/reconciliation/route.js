import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { getOrderConfig } from '../../../../../lib/monetization/payments';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:payments:reconciliation:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const db = admin.firestore();
    const paymentsSnap = await db.collection('payments').orderBy('createdAt', 'desc').limit(300).get();

    const checks = await Promise.all(
      paymentsSnap.docs.map(async (paymentDoc) => {
        const payment = paymentDoc.data();
        const config = getOrderConfig(payment.orderType);
        if (!config) {
          return {
            paymentId: paymentDoc.id,
            orderType: payment.orderType,
            orderId: payment.orderId,
            paymentStatus: payment.status,
            consistent: false,
            reason: 'Unsupported orderType mapping',
          };
        }

        const orderSnap = await db.collection(config.collection).doc(payment.orderId).get();
        if (!orderSnap.exists) {
          return {
            paymentId: paymentDoc.id,
            orderType: payment.orderType,
            orderId: payment.orderId,
            paymentStatus: payment.status,
            consistent: false,
            reason: 'Order not found',
          };
        }

        const order = orderSnap.data();
        const orderStatus = order?.[config.statusField] || 'unknown';
        const expectedStatus = payment.status === 'paid' ? 'paid' : payment.status === 'failed' ? 'failed' : 'pending_payment';

        return {
          paymentId: paymentDoc.id,
          orderType: payment.orderType,
          orderId: payment.orderId,
          paymentStatus: payment.status,
          orderStatus,
          expectedStatus,
          consistent: orderStatus === expectedStatus,
        };
      })
    );

    const inconsistent = checks.filter((entry) => !entry.consistent);

    return NextResponse.json({
      totalChecked: checks.length,
      inconsistentCount: inconsistent.length,
      inconsistent,
    });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/payments/reconciliation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
