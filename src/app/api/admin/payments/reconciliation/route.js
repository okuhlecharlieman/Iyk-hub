import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { getOrderConfig, LEDGER_ENTRY_TYPES } from '../../../../../lib/monetization/constants';
import { handleApiError } from '../../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:payments:reconciliation:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const db = admin.firestore();

    const { searchParams } = new URL(request.url);
    const limitN = Math.min(Math.max(parseInt(searchParams.get('limit') || '300', 10), 1), 1000);
    const cursor = searchParams.get('cursor');

    let paymentsQuery = db.collection('payments').orderBy('createdAt', 'desc').limit(limitN);
    if (cursor) {
      const cursorSnap = await db.collection('payments').doc(cursor).get();
      if (cursorSnap.exists) {
        paymentsQuery = paymentsQuery.startAfter(cursorSnap);
      }
    }

    const paymentsSnap = await paymentsQuery.get();

    const ledgerSnap = await db.collection('financialLedger')
      .where('entryType', '==', LEDGER_ENTRY_TYPES.CHARGE_SUCCEEDED)
      .orderBy('createdAt', 'desc')
      .limit(limitN)
      .get();

    const ledgerByOrder = new Map();
    for (const doc of ledgerSnap.docs) {
      const data = doc.data();
      if (data.orderId) {
        ledgerByOrder.set(`${data.orderType}:${data.orderId}`, doc.id);
      }
    }

    const checks = await Promise.all(
      paymentsSnap.docs.map(async (paymentDoc) => {
        const payment = paymentDoc.data();
        const config = getOrderConfig(payment.orderType);

        const result = {
          paymentId: paymentDoc.id,
          orderType: payment.orderType,
          orderId: payment.orderId,
          paymentStatus: payment.status,
          amountCents: payment.amountCents || 0,
          consistent: true,
          issues: [],
        };

        if (!config) {
          result.consistent = false;
          result.issues.push('Unsupported orderType mapping');
          return result;
        }

        if (payment.orderId) {
          const orderSnap = await db.collection(config.collection).doc(payment.orderId).get();
          if (!orderSnap.exists) {
            result.consistent = false;
            result.issues.push('Order document not found');
          } else {
            const order = orderSnap.data();
            const orderStatus = order?.[config.statusField] || 'unknown';
            const expectedStatus = payment.status === 'paid' ? 'paid' : payment.status === 'failed' ? 'failed' : 'pending_payment';
            result.orderStatus = orderStatus;
            result.expectedStatus = expectedStatus;
            if (orderStatus !== expectedStatus) {
              result.consistent = false;
              result.issues.push(`Order status mismatch: expected ${expectedStatus}, got ${orderStatus}`);
            }
          }
        }

        if (payment.status === 'paid') {
          const ledgerKey = `${payment.orderType}:${payment.orderId}`;
          if (!ledgerByOrder.has(ledgerKey)) {
            result.consistent = false;
            result.issues.push('No matching ledger entry for paid payment');
          }
        }

        return result;
      })
    );

    const inconsistent = checks.filter((entry) => !entry.consistent);
    const lastDoc = paymentsSnap.docs[paymentsSnap.docs.length - 1];
    const nextCursor = paymentsSnap.docs.length === limitN ? lastDoc?.id : null;

    return NextResponse.json({
      totalChecked: checks.length,
      inconsistentCount: inconsistent.length,
      inconsistent,
      nextCursor,
    });
  } catch (error) {
    return handleApiError(error, 'Error in /api/admin/payments/reconciliation:');
  }
}
