import { NextResponse } from 'next/server';
import { buffer } from 'stream/consumers';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import {
  verifyStripeWebhookSignature,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
} from '../../../../lib/stripe/stripe-client';

// Stripe requires the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function logStripeEvent(db, event) {
  try {
    await db.collection('stripeWebhookLogs').add({
      type: event.type,
      eventId: event.id,
      timestamp: new Date(event.created * 1000),
      dataObjectId: event.data.object.id,
      success: true,
      receivedAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging Stripe event:', error);
  }
}

async function handlePaymentEvent(event, db) {
  const { type, data } = event;

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
      // Handle cancellation if needed
      console.log('Payment intent cancelled:', data.object.id);
      break;

    case 'charge.refunded':
      // Handle refund if needed
      console.log('Charge refunded:', data.object.id);
      break;

    default:
      console.log(`Unhandled Stripe event type: ${type}`);
  }
}

export async function POST(request) {
  try {
    await initializeFirebaseAdmin();

    // Get raw body for signature verification
    const buf = await buffer(request.body);
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyStripeWebhookSignature(buf, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    console.log(`Processing Stripe event: ${event.type}`);

    const db = admin.firestore();

    // Handle the event
    await handlePaymentEvent(event, db);

    // Log the event for audit trail
    await logStripeEvent(db, event);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
