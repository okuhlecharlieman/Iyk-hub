const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getHeaders() {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function initializeTransaction({ email, amountCents, currency = 'ZAR', reference, metadata = {}, callbackUrl }) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email,
      amount: amountCents,
      currency: currency.toUpperCase(),
      reference,
      metadata,
      callback_url: callbackUrl,
    }),
  });

  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Failed to initialize PayStack transaction');
  }
  return json.data;
}

export async function verifyTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: getHeaders(),
  });

  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Failed to verify transaction');
  }
  return json.data;
}

export function verifyWebhookSignature(body, signature) {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(body).digest('hex');
  return hash === signature;
}
