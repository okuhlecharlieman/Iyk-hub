import Stripe from 'stripe';

let stripeInstance = null;

export function getStripeClient() {
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

/**
 * Create a Stripe Payment Intent for a sponsored challenge or other order
 */
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

/**
 * Retrieve a Stripe Payment Intent
 */
export async function getStripePaymentIntent(intentId) {
  const stripe = getStripeClient();
  try {
    const intent = await stripe.paymentIntents.retrieve(intentId);
    return intent;
  } catch (error) {
    console.error('Error retrieving Stripe payment intent:', error);
    throw error;
  }
}

/**
 * Create or get a Stripe Customer
 */
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

/**
 * Verify Stripe webhook signature
 */
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

/**
 * Handle payment intent succeeded event
 */
export async function handlePaymentIntentSucceeded(event, { db, logPayment }) {
  const paymentIntent = event.data.object;
  const { orderType, orderId } = paymentIntent.metadata;

  // Log the payment
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

  // Update order status in database
  const COLLECTIONS_MAP = {
    sponsoredChallenge: 'sponsoredChallengeOrders',
    creatorBoost: 'creatorBoostOrders',
    institutionPlan: 'institutionAccounts',
  };

  const collectionName = COLLECTIONS_MAP[orderType];
  if (collectionName && db) {
    await db.collection(collectionName).doc(orderId).set(
      {
        paymentStatus: 'paid',
        paymentIntentId: paymentIntent.id,
        paidAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  return true;
}

/**
 * Handle payment intent failed event
 */
export async function handlePaymentIntentFailed(event, { db, logPayment }) {
  const paymentIntent = event.data.object;
  const { orderType, orderId } = paymentIntent.metadata;

  // Log the failure
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

  // Update order status
  const COLLECTIONS_MAP = {
    sponsoredChallenge: 'sponsoredChallengeOrders',
    creatorBoost: 'creatorBoostOrders',
    institutionPlan: 'institutionAccounts',
  };

  const collectionName = COLLECTIONS_MAP[orderType];
  if (collectionName && db) {
    await db.collection(collectionName).doc(orderId).set(
      {
        paymentStatus: 'failed',
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  return true;
}
