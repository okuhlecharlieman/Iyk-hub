'use client';
import { useState, useEffect } from 'react';
import { FaLock } from 'react-icons/fa';

export default function PaystackCheckout({ email, amountCents, reference, onSuccess, onError, metadata = {} }) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else if (typeof window !== 'undefined' && window.PaystackPop) {
      setScriptLoaded(true);
    }
  }, []);

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

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: amountCents,
      currency: 'ZAR',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Order Reference', variable_name: 'reference', value: reference },
          ...Object.entries(metadata).map(([key, value]) => ({
            display_name: key,
            variable_name: key,
            value: String(value),
          })),
        ],
      },
      onClose: () => {
        setLoading(false);
      },
      callback: (response) => {
        setLoading(false);
        onSuccess?.(response);
      },
    });

    handler.openIframe();
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
