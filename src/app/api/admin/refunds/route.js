import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields, handleApiError } from '../../../../lib/api/validation';
import { enforceDistributedRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
import { appendLedgerEntry } from '../../../../lib/monetization/ledger';
import { LEDGER_ENTRY_TYPES } from '../../../../lib/monetization/constants';
export const dynamic = 'force-dynamic';

const validateRefundPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['paystackReference', 'amountCents', 'reason']);

  if (typeof payload.paystackReference !== 'string' || payload.paystackReference.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'paystackReference', message: 'paystackReference is required.' }]);
  }

  if (payload.amountCents !== undefined && (typeof payload.amountCents !== 'number' || payload.amountCents <= 0)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'amountCents', message: 'amountCents must be a positive number.' }]);
  }

  if (payload.reason !== undefined && (typeof payload.reason !== 'string' || payload.reason.length > 500)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'reason', message: 'reason must be a string up to 500 chars.' }]);
  }

  return {
    paystackReference: payload.paystackReference.trim(),
    amountCents: payload.amountCents || null,
    reason: payload.reason?.trim() || 'Admin-initiated refund',
  };
};

export async function POST(request) {
  const rateLimitResponse = await enforceDistributedRateLimit(request, {
    keyPrefix: 'admin:refunds:create',
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticate(request);

    const payload = await parseJsonBody(request);
    const { paystackReference, amountCents, reason } = validateRefundPayload(payload);

    const db = admin.firestore();

    const paymentSnap = await db.collection('paymentLogs')
      .where('paystackReference', '==', paystackReference)
      .limit(1)
      .get();

    if (paymentSnap.empty) {
      return NextResponse.json({ error: 'Payment not found for this reference.' }, { status: 404 });
    }

    const payment = paymentSnap.docs[0].data();
    const refundAmount = amountCents || payment.amountCents;

    if (refundAmount > payment.amountCents) {
      return NextResponse.json({ error: 'Refund amount exceeds original payment.' }, { status: 400 });
    }

    const existingRefund = await db.collection('refunds')
      .where('paystackReference', '==', paystackReference)
      .limit(1)
      .get();

    if (!existingRefund.empty) {
      return NextResponse.json({ error: 'Refund already exists for this reference.' }, { status: 409 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    let paystackRefundId = null;
    let paystackRefundStatus = 'pending_manual';

    if (secret) {
      try {
        const refundRes = await fetch('https://api.paystack.co/refund', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction: paystackReference,
            amount: refundAmount,
          }),
        });
        const refundData = await refundRes.json();
        if (refundData.status) {
          paystackRefundId = refundData.data?.id || null;
          paystackRefundStatus = refundData.data?.status || 'processed';
        }
      } catch (err) {
        console.error('PayStack refund API error:', err);
      }
    }

    const refundRef = await db.collection('refunds').add({
      paystackReference,
      originalAmountCents: payment.amountCents,
      refundAmountCents: refundAmount,
      currency: payment.currency || 'ZAR',
      reason,
      paystackRefundId,
      status: paystackRefundStatus,
      orderType: payment.orderType || null,
      orderId: payment.orderId || null,
      initiatedBy: actor.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await appendLedgerEntry(db, {
      entryType: LEDGER_ENTRY_TYPES.REFUND_CREATED,
      orderType: payment.orderType || null,
      orderId: payment.orderId || null,
      amountCents: refundAmount,
      currency: payment.currency || 'ZAR',
      description: `Refund for ${paystackReference}: ${reason}`,
      metadata: { paystackRefundId, refundId: refundRef.id },
    });

    await logAdminAction({
      request,
      actor,
      action: 'refund.created',
      targetType: 'payment',
      targetId: paystackReference,
      metadata: { refundAmountCents: refundAmount, reason, refundId: refundRef.id },
    });

    return NextResponse.json({
      success: true,
      refundId: refundRef.id,
      refundAmountCents: refundAmount,
      status: paystackRefundStatus,
    });
  } catch (error) {
    return handleApiError(error, 'Error creating refund');
  }
}

export async function GET(request) {
  const rateLimitResponse = await enforceDistributedRateLimit(request, {
    keyPrefix: 'admin:refunds:list',
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    await authenticate(request);

    const db = admin.firestore();
    const { searchParams } = new URL(request.url);
    const limitN = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const cursor = searchParams.get('cursor');

    let query = db.collection('refunds').orderBy('createdAt', 'desc').limit(limitN);
    if (cursor) {
      const cursorSnap = await db.collection('refunds').doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snap = await query.get();
    const refunds = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = snap.docs.length === limitN ? lastDoc?.id : null;

    return NextResponse.json({ success: true, refunds, nextCursor });
  } catch (error) {
    return handleApiError(error, 'Error listing refunds');
  }
}
