'use client';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaLock } from 'react-icons/fa';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ clientSecret, amountCents, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {},
        },
      });

      if (stripeError) {
        setError(stripeError.message);
        onError?.(stripeError);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSucceeded(true);
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  if (succeeded) {
    return (
      <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
        <div className="text-green-600 dark:text-green-400 text-lg font-semibold mb-2">
          ✓ Payment Successful
        </div>
        <p className="text-green-700 dark:text-green-300">
          Your payment has been processed successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Details
        </label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#fa755a',
              },
            },
          }}
          className="p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <FaLock className="mr-2" />
        {loading ? 'Processing...' : `Pay ZAR ${(amountCents / 100).toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Your payment is secure and encrypted with Stripe.
      </p>
    </form>
  );
}

export default function StripeCheckout({ clientSecret, amountCents, onSuccess, onError }) {
  if (!stripePromise) {
    return <div className="text-red-600">Stripe is not configured</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-md mx-auto">
        <CheckoutForm
          clientSecret={clientSecret}
          amountCents={amountCents}
          onSuccess={onSuccess}
          onError={onError}
        />
      </div>
    </Elements>
  );
}
