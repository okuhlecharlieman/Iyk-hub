import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceDistributedRateLimit } from '../../../../lib/api/rate-limit';
import { logDataAccess } from '../../../../lib/api/logging';
import { createStripePaymentIntent, createOrGetStripeCustomer } from '../../../../lib/stripe/stripe-client';
import { getOrderConfig } from '../../../../lib/monetization/constants';
export const dynamic = 'force-dynamic';

const validatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['orderType', 'orderId']);

  if (typeof payload.orderType !== 'string' || payload.orderType.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderType', message: 'orderType is required.' }]);
  }

  if (typeof payload.orderId !== 'string' || payload.orderId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderId', message: 'orderId is required.' }]);
  }

  return {
    orderType: payload.orderType.trim(),
    orderId: payload.orderId.trim(),
  };
};

export async function POST(request) {
  const rateLimitResponse = await enforceDistributedRateLimit(request, { keyPrefix: 'payments:create-intent', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const { orderType, orderId } = validatePayload(payload);

    const config = getOrderConfig(orderType);
    if (!config) {
      return NextResponse.json({ error: 'Unsupported orderType' }, { status: 400 });
    }

    const db = admin.firestore();
    const orderSnap = await db.collection(config.collection).doc(orderId).get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const order = orderSnap.data();
    
    // Verify ownership
    const ownerUid = order.creatorUid || order.ownerUid || order.userId;
    if (ownerUid !== uid) {
      return NextResponse.json({ error: 'Forbidden for this order.' }, { status: 403 });
    }

    // Get amount
    const amountCents = Number(order.budgetCents || order.feeCents || order.feeCentsMonthly || 0);
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Order has no payable amount.' }, { status: 400 });
    }

    // Get user email for Stripe customer
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const userEmail = userData.email || `user_${uid}@intwana.local`;
    const userName = userData.displayName || `User ${uid.slice(0, 8)}`;

    // Get or create Stripe customer
    const stripeCustomer = await createOrGetStripeCustomer({
      email: userEmail,
      name: userName,
      customerId: order.stripeCustomerId,
      metadata: {
        uid,
        orderType,
      },
    });

    // Create Stripe Payment Intent
    const paymentIntent = await createStripePaymentIntent({
      amountCents,
      currency: 'ZAR', // South Africa - adjust as needed
      orderType,
      orderId,
      customerId: stripeCustomer.id,
      description: `${orderType} payment for ${orderId}`,
      metadata: {
        orderType,
        orderId,
        uid,
      },
    });

    // Create local payment record for tracking
    const paymentRef = await db.collection('payments').add({
      ownerUid: uid,
      orderType,
      orderId,
      amountCents,
      currency: 'ZAR',
      status: 'pending',
      provider: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomer.id,
      metadata: {
        source: 'create-intent-api',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update order with Stripe info
    await db.collection(config.collection).doc(orderId).set({
      [config.statusField]: 'pending_payment',
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomer.id,
      latestPaymentId: paymentRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Log access
    await logDataAccess({
      request,
      userId: uid,
      accessType: 'write',
      resourceType: 'paymentIntent',
      resourceId: paymentIntent.id,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      status: 'pending',
      message: 'Payment intent created successfully. Use clientSecret to complete checkout.',
    });
  } catch (error) {
    return handleApiError(error, 'Error in /api/payments/create-intent');
  }
}
