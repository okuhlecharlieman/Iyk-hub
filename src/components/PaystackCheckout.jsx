'use client';
import { useEffect, useState } from 'react';
import { FaLock } from 'react-icons/fa';

const PAYSTACK_SCRIPT_ID = 'paystack-script';
const PAYSTACK_SCRIPT_SRC = 'https://js.paystack.co/v2/inline.js';

export default function PaystackCheckout({ email, amountCents, reference, onSuccess, onError, metadata = {} }) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleLoad = () => setScriptLoaded(Boolean(window.PaystackPop));
    const handleError = () => {
      setScriptLoaded(false);
      onError?.({ message: 'Payment system failed to load. Please refresh and try again.' });
    };

    if (window.PaystackPop) {
      setScriptLoaded(true);
      return undefined;
    }

    let script = document.getElementById(PAYSTACK_SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = PAYSTACK_SCRIPT_ID;
      script.src = PAYSTACK_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [onError]);

  const handlePay = () => {
    if (!scriptLoaded || !window.PaystackPop) {
      onError?.({ message: 'Payment system is loading. Please try again.' });
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      onError?.({ message: 'Payment is not configured. Please contact support.' });
      return;
    }

    setLoading(true);

    const popup = new window.PaystackPop();
    popup.newTransaction({
      key: publicKey,
      email,
      amount: amountCents,
      currency: 'ZAR',
      reference,
      metadata: {
        ...metadata,
        custom_fields: [
          { display_name: 'Order Reference', variable_name: 'reference', value: reference },
          ...Object.entries(metadata).map(([key, value]) => ({
            display_name: key,
            variable_name: key,
            value: String(value),
          })),
        ],
      },
      onCancel: () => {
        setLoading(false);
      },
      onError: (error) => {
        setLoading(false);
        onError?.({ message: error?.message || 'Payment failed. Please try again.' });
      },
      onSuccess: (response) => {
        setLoading(false);
        onSuccess?.(response);
      },
    });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handlePay}
        disabled={loading || !scriptLoaded}
        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <FaLock className="mr-2" />
        {loading ? 'Processing...' : `Pay ZAR ${(amountCents / 100).toFixed(2)}`}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Secure payment powered by Paystack.
      </p>
    </div>
  );
}
