# Stripe Payment Integration Guide

Complete guide to set up and use the Stripe payment system for Intwana Hub.

## Prerequisites

- Stripe account (create at https://stripe.com)
- Node.js with the stripe package installed

## 1. Installation

First, install the required Stripe packages:

```bash
npm install stripe @stripe/react-stripe-js @stripe/js
```

## 2. Environment Variables

Add these variables to your `.env.local` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Secret key from Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Publishable key from Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret
```

### How to get these keys:

1. **STRIPE_SECRET_KEY & NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**:
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your test keys (for development) or live keys (for production)
   - **Secret Key** → `STRIPE_SECRET_KEY`
   - **Publishable Key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

2. **STRIPE_WEBHOOK_SECRET**:
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/payments/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

## 3. Database Collections

The system automatically creates/uses these Firestore collections:

```
payments
├── id: string (auto-generated)
├── ownerUid: string
├── orderType: string (e.g., 'sponsoredChallenge')
├── orderId: string
├── amountCents: number
├── currency: string (e.g., 'ZAR')
├── status: string ('pending', 'succeeded', 'failed')
├── provider: string ('stripe')
├── stripePaymentIntentId: string
├── stripeCustomerId: string
├── metadata: object
├── createdAt: timestamp
└── updatedAt: timestamp

paymentLogs
├── id: string (auto-generated)
├── paymentIntentId: string
├── orderType: string
├── orderId: string
├── amountCents: number
├── currency: string
├── status: string
├── customerId: string
├── failureMessage: string (if failed)
└── processedAt: timestamp

stripeWebhookLogs
├── id: string (auto-generated)
├── type: string (event type)
├── eventId: string
├── timestamp: timestamp
├── dataObjectId: string
├── success: boolean
└── receivedAt: timestamp
```

## 4. API Endpoints

### Create Payment Intent

**POST** `/api/payments/create-intent`

Request body:
```json
{
  "orderType": "sponsoredChallenge",
  "orderId": "challenge_id_123"
}
```

Response:
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amountCents": 50000,
  "status": "pending",
  "message": "Payment intent created successfully. Use clientSecret to complete checkout."
}
```

### Webhook Endpoint

**POST** `/api/payments/webhook`

Stripe automatically posts payment events here. No manual action needed.

## 5. Using the Checkout Component

```jsx
import { useState } from 'react';
import StripeCheckout from '../components/StripeCheckout';

export default function CheckoutPage({ challengeId }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [amountCents, setAmountCents] = useState(null);

  const initializePayment = async () => {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType: 'sponsoredChallenge',
        orderId: challengeId,
      }),
    });

    const data = await response.json();
    if (data.success) {
      setClientSecret(data.clientSecret);
      setAmountCents(data.amountCents);
    }
  };

  return (
    <div>
      <button onClick={initializePayment}>Start Checkout</button>
      
      {clientSecret && (
        <StripeCheckout
          clientSecret={clientSecret}
          amountCents={amountCents}
          onSuccess={(paymentIntent) => {
            console.log('Payment successful:', paymentIntent);
            // Redirect to success page
          }}
          onError={(error) => {
            console.error('Payment failed:', error);
          }}
        />
      )}
    </div>
  );
}
```

## 6. Testing Payments

Use Stripe's test card numbers:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined card**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`
- **Expired card**: `4000 0000 0000 0069`

Expiry: Any future date  
CVC: Any 3 digits

## 7. Monitoring Payments

### View Payment Logs

In Firestore console:
- `paymentLogs` collection contains all payment attempts
- `stripeWebhookLogs` contains Stripe event logs

### Rate Limits

Payment creation is rate-limited to:
- `20 requests/minute` per IP address

## 8. Order Types Supported

```javascript
{
  'sponsoredChallenge': 'sponsoredChallengeOrders',
  'creatorBoost': 'creatorBoostOrders',
  'institutionPlan': 'institutionAccounts',
}
```

To add new order types:
1. Update `ORDER_CONFIG` in `/src/app/api/payments/create-intent/route.js`
2. Ensure the collection exists in Firestore with appropriate fields

## 9. Deployment Configuration

### Vercel Environment Variables

Add to your Vercel project:

1. Go to Settings → Environment Variables
2. Add:
   - `STRIPE_SECRET_KEY` (production key)
   - `STRIPE_WEBHOOK_SECRET` (production signing secret)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (production publishable key)

### Update Webhook URL

In Stripe Dashboard → Webhooks:
1. Update the endpoint URL to your production domain:
   - Development: `http://localhost:3000/api/payments/webhook`
   - Production: `https://yourdomain.vercel.app/api/payments/webhook`

## 10. Troubleshooting

### "STRIPE_SECRET_KEY is not configured"
- Add `STRIPE_SECRET_KEY` to `.env.local`
- Restart the dev server

### Webhook not receiving events
- Verify endpoint URL in Stripe Dashboard
- Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
- If deployed to Vercel, use production domain

### Payment intent creation fails
- Check user is authenticated (401 error)
- Verify order exists and belongs to user (403 error)
- Check order has valid amount in `budgetCents` field

### Customer object not found
- Stripe customer is created automatically on first payment
- If issues persist, check Firestore logs for errors

## 11. Next Steps

- [ ] Test payment flow in development
- [ ] Set up production Stripe account
- [ ] Deploy to Vercel with production keys
- [ ] Test production payments with small amounts
- [ ] Monitor webhook logs for issues
- [ ] Set up payment reconciliation reports
- [ ] Implement payment retries for failed charges

## Support

For Stripe-specific issues:
- Stripe Docs: https://stripe.com/docs/api
- Stripe Support: https://support.stripe.com

For Intwana Hub issues:
- Check error logs in Firestore
- Review payment and webhook logs
- Check browser console for client-side errors
