import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

const validateUpdatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['orderId', 'paymentStatus', 'reviewStatus', 'note']);

  if (typeof payload.orderId !== 'string' || payload.orderId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderId', message: 'orderId is required.' }]);
  }

  const allowedPayment = ['pending_payment', 'paid', 'failed', 'refunded'];
  const allowedReview = ['pending_review', 'approved', 'rejected'];

  if (payload.paymentStatus !== undefined && !allowedPayment.includes(payload.paymentStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'paymentStatus', message: 'Invalid paymentStatus.' }]);
  }

  if (payload.reviewStatus !== undefined && !allowedReview.includes(payload.reviewStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'reviewStatus', message: 'Invalid reviewStatus.' }]);
  }

  return {
    orderId: payload.orderId.trim(),
    paymentStatus: payload.paymentStatus,
    reviewStatus: payload.reviewStatus,
    note: typeof payload.note === 'string' ? payload.note.trim() : null,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:sponsored:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const snap = await admin.firestore().collection('sponsoredOpportunityOrders').orderBy('createdAt', 'desc').limit(200).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in /api/admin/sponsored-opportunities GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:sponsored:put', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await authenticate(request);
    await initializeFirebaseAdmin();

    const payload = await parseJsonBody(request);
    const update = validateUpdatePayload(payload);

    const db = admin.firestore();
    const orderRef = db.collection('sponsoredOpportunityOrders').doc(update.orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const order = orderSnap.data();
    const patch = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: actor.uid,
    };

    if (update.paymentStatus) patch.paymentStatus = update.paymentStatus;
    if (update.reviewStatus) patch.reviewStatus = update.reviewStatus;
    if (update.note !== null) patch.note = update.note;

    await orderRef.set(patch, { merge: true });

    const opportunityPatch = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (update.paymentStatus) {
      opportunityPatch['monetization.paymentStatus'] = update.paymentStatus;
    }

    if (update.reviewStatus === 'approved' && (update.paymentStatus === 'paid' || order.paymentStatus === 'paid')) {
      opportunityPatch.status = 'approved';
      opportunityPatch.moderationStatus = 'approved';
    }

    if (update.reviewStatus === 'rejected') {
      opportunityPatch.status = 'rejected';
      opportunityPatch.moderationStatus = 'rejected';
    }

    await db.collection('opportunities').doc(order.opportunityId).set(opportunityPatch, { merge: true });

    await logAdminAction({
      request,
      actor,
      action: 'sponsored.opportunity.updated',
      targetType: 'sponsoredOpportunityOrder',
      targetId: update.orderId,
      metadata: {
        paymentStatus: update.paymentStatus,
        reviewStatus: update.reviewStatus,
      },
    });

    return NextResponse.json({ success: true, message: 'Sponsored opportunity updated.' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/sponsored-opportunities PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
