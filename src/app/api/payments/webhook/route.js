import { NextResponse } from 'next/server';
import { buffer } from 'stream/consumers';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import {
  verifyStripeWebhookSignature,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleChargeRefunded,
  handleDisputeCreated,
  handleDisputeClosed,
} from '../../../../lib/stripe/stripe-client';
export const dynamic = 'force-dynamic';

/**
 * Check idempotency: return true if this event was already processed.
 * Uses a Firestore transaction to atomically check-and-set.
 */
async function isEventAlreadyProcessed(db, eventId) {
  const eventRef = db.collection('stripeProcessedEvents').doc(eventId);

  try {
    const alreadyProcessed = await db.runTransaction(async (txn) => {
      const doc = await txn.get(eventRef);
      if (doc.exists) return true;

      txn.set(eventRef, {
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return false;
    });

    return alreadyProcessed;
  } catch (error) {
    console.error('Idempotency check failed, proceeding cautiously:', error);
    return false;
  }
}

async function logStripeEvent(db, event, success) {
  try {
    await db.collection('stripeWebhookLogs').add({
      type: event.type,
      eventId: event.id,
      timestamp: new Date(event.created * 1000),
      dataObjectId: event.data.object.id,
      success,
      receivedAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging Stripe event:', error);
  }
}

async function handlePaymentEvent(event, db) {
  const { type } = event;

  switch (type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event, {
        db,
        logPayment: async (paymentData) => {
          await db.collection('paymentLogs').add({
            ...paymentData,
            processedAt: new Date(),
          });
        },
      });
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event, {
        db,
        logPayment: async (paymentData) => {
          await db.collection('paymentLogs').add({
            ...paymentData,
            processedAt: new Date(),
          });
        },
      });
      break;

    case 'payment_intent.canceled':
      console.log('Payment intent cancelled:', event.data.object.id);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event, { db });
      break;

    case 'charge.dispute.created':
      await handleDisputeCreated(event, { db });
      break;

    case 'charge.dispute.closed':
    case 'charge.dispute.updated':
      await handleDisputeClosed(event, { db });
      break;

    default:
      console.log(`Unhandled Stripe event type: ${type}`);
  }
}

export async function POST(request) {
  try {
    await initializeFirebaseAdmin();

    const buf = await buffer(request.body);
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = verifyStripeWebhookSignature(buf, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    const db = admin.firestore();

    // Idempotency check: skip if already processed
    const alreadyProcessed = await isEventAlreadyProcessed(db, event.id);
    if (alreadyProcessed) {
      console.log(`Skipping duplicate Stripe event: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

    await handlePaymentEvent(event, db);
    await logStripeEvent(db, event, true);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
