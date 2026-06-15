/**
 * stripe-client utilities (stripe).
 */
import Stripe from 'stripe';
import { ORDER_CONFIG, LEDGER_ENTRY_TYPES } from '../monetization/constants';
import { appendLedgerEntry, recordChargeWithFees } from '../monetization/ledger';

let stripeInstance = null;

/** Fetches/retrieves data — getStripeClient. */
function getStripeClient() {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 3,
    });
  }
  return stripeInstance;
}

/** Creates/generates — createStripePaymentIntent. */
export async function createStripePaymentIntent({
  amountCents,
  currency = 'USD',
  orderType,
  orderId,
  customerId,
  description,
  metadata = {},
}) {
  const stripe = getStripeClient();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      customer: customerId,
      description,
      metadata: {
        orderType,
        orderId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      statement_descriptor: 'INTWANA HUB',
    });

    return intent;
  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
    throw error;
  }
}

/** Creates/generates — createOrGetStripeCustomer. */
export async function createOrGetStripeCustomer({
  email,
  name,
  customerId,
  metadata = {},
}) {
  const stripe = getStripeClient();

  try {
    if (customerId) {
      return await stripe.customers.retrieve(customerId);
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error);
    throw error;
  }
}

/** verify Stripe Webhook Signature. */
export function verifyStripeWebhookSignature(body, signature) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}

/** Handles payment intent succeeded action. */
export async function handlePaymentIntentSucceeded(event, { db, logPayment }) {
  const paymentIntent = event.data.object;
  const { orderType, orderId } = paymentIntent.metadata;

  if (logPayment) {
    await logPayment({
      paymentIntentId: paymentIntent.id,
      orderType,
      orderId,
      amountCents: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'succeeded',
      customerId: paymentIntent.customer,
    });
  }

  // Record in financial ledger with fee breakdown
  await recordChargeWithFees(db, {
    orderType,
    orderId,
    grossAmountCents: paymentIntent.amount,
    currency: paymentIntent.currency.toUpperCase(),
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntent.id,
  });

  // Update order status using unified config
  const config = ORDER_CONFIG[orderType];
  if (config && db) {
    await db.collection(config.collection).doc(orderId).set(
      {
        [config.statusField]: 'paid',
        paymentIntentId: paymentIntent.id,
        paidAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  // Update local payment record
  const paymentsSnap = await db.collection('payments')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!paymentsSnap.empty) {
    await paymentsSnap.docs[0].ref.update({
      status: 'paid',
      updatedAt: new Date(),
    });
  }

  return true;
}

/** Handles payment intent failed action. */
export async function handlePaymentIntentFailed(event, { db, logPayment }) {
  const paymentIntent = event.data.object;
  const { orderType, orderId } = paymentIntent.metadata;

  if (logPayment) {
    await logPayment({
      paymentIntentId: paymentIntent.id,
      orderType,
      orderId,
      amountCents: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'failed',
      failureMessage: paymentIntent.last_payment_error?.message,
    });
  }

  // Record in financial ledger
  await appendLedgerEntry(db, {
    entryType: LEDGER_ENTRY_TYPES.CHARGE_FAILED,
    orderType,
    orderId,
    amountCents: paymentIntent.amount,
    currency: paymentIntent.currency.toUpperCase(),
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntent.id,
    description: paymentIntent.last_payment_error?.message || 'Payment failed',
  });

  // Update order status using unified config
  const config = ORDER_CONFIG[orderType];
  if (config && db) {
    await db.collection(config.collection).doc(orderId).set(
      {
        [config.statusField]: 'failed',
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  return true;
}

/**
 * Handle charge.refunded webhook event
 */
export async function handleChargeRefunded(event, { db }) {
  const charge = event.data.object;
  const paymentIntentId = charge.payment_intent;
  const refundAmountCents = charge.amount_refunded;

  // Look up the original order from the payment intent
  let orderType = null;
  let orderId = null;

  if (paymentIntentId) {
    const paymentsSnap = await db.collection('payments')
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!paymentsSnap.empty) {
      const paymentData = paymentsSnap.docs[0].data();
      orderType = paymentData.orderType;
      orderId = paymentData.orderId;

      await paymentsSnap.docs[0].ref.update({
        status: 'refunded',
        refundedAmountCents: refundAmountCents,
        updatedAt: new Date(),
      });
    }
  }

  // Record refund in ledger
  await appendLedgerEntry(db, {
    entryType: LEDGER_ENTRY_TYPES.REFUND_CREATED,
    orderType,
    orderId,
    amountCents: refundAmountCents,
    currency: charge.currency.toUpperCase(),
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntentId,
    description: `Refund of ${refundAmountCents} cents`,
  });

  // Update order status if we found the order
  if (orderType && orderId) {
    const config = ORDER_CONFIG[orderType];
    if (config) {
      await db.collection(config.collection).doc(orderId).set(
        {
          [config.statusField]: 'refunded',
          refundedAt: new Date(),
          refundedAmountCents: refundAmountCents,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }
  }

  return true;
}

/**
 * Handle charge.dispute.created webhook event
 */
export async function handleDisputeCreated(event, { db }) {
  const dispute = event.data.object;
  const paymentIntentId = dispute.payment_intent;
  const disputeAmountCents = dispute.amount;

  let orderType = null;
  let orderId = null;

  if (paymentIntentId) {
    const paymentsSnap = await db.collection('payments')
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!paymentsSnap.empty) {
      const paymentData = paymentsSnap.docs[0].data();
      orderType = paymentData.orderType;
      orderId = paymentData.orderId;

      await paymentsSnap.docs[0].ref.update({
        status: 'disputed',
        disputeId: dispute.id,
        disputeReason: dispute.reason,
        updatedAt: new Date(),
      });
    }
  }

  await appendLedgerEntry(db, {
    entryType: LEDGER_ENTRY_TYPES.DISPUTE_OPENED,
    orderType,
    orderId,
    amountCents: disputeAmountCents,
    currency: dispute.currency.toUpperCase(),
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntentId,
    description: `Dispute opened: ${dispute.reason}`,
    metadata: { disputeId: dispute.id, reason: dispute.reason },
  });

  return true;
}

/**
 * Handle charge.dispute.closed webhook event (won or lost)
 */
export async function handleDisputeClosed(event, { db }) {
  const dispute = event.data.object;
  const paymentIntentId = dispute.payment_intent;
  const won = dispute.status === 'won';

  let orderType = null;
  let orderId = null;

  if (paymentIntentId) {
    const paymentsSnap = await db.collection('payments')
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!paymentsSnap.empty) {
      const paymentData = paymentsSnap.docs[0].data();
      orderType = paymentData.orderType;
      orderId = paymentData.orderId;

      await paymentsSnap.docs[0].ref.update({
        status: won ? 'paid' : 'dispute_lost',
        disputeOutcome: dispute.status,
        updatedAt: new Date(),
      });
    }
  }

  await appendLedgerEntry(db, {
    entryType: won ? LEDGER_ENTRY_TYPES.DISPUTE_WON : LEDGER_ENTRY_TYPES.DISPUTE_LOST,
    orderType,
    orderId,
    amountCents: dispute.amount,
    currency: dispute.currency.toUpperCase(),
    stripeEventId: event.id,
    stripePaymentIntentId: paymentIntentId,
    description: `Dispute ${dispute.status}: ${dispute.reason}`,
    metadata: { disputeId: dispute.id },
  });

  return true;
}
