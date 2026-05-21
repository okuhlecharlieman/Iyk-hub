'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PaystackCheckout from '../../components/PaystackCheckout';
import Button from '../../components/ui/Button';
import { FaHeart } from 'react-icons/fa';

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000];

export default function DonatePage() {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const amountCents = selectedAmount || (Number(customAmount) * 100) || 0;

  const handleProceed = () => {
    if (amountCents < 500) {
      setError('Minimum donation is R5.00');
      return;
    }
    if (!user?.email) {
      setError('Please log in to donate.');
      return;
    }
    setError(null);
    setShowPayment(true);
  };

  const donationId = `donate-${user?.uid || 'anon'}-${Date.now()}`;
  const reference = donationId;

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:py-8 md:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-full p-3 text-white shadow-lg">
              <FaHeart className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Support IYK Hub
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Help us grow and keep building amazing experiences for the community.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Choose an amount</h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); setShowPayment(false); }}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  selectedAmount === amt
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                R{(amt / 100).toFixed(0)}
              </button>
            ))}
            <div className="col-span-3">
              <input
                type="number"
                min="5"
                placeholder="Custom amount (ZAR)"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); setShowPayment(false); }}
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {message && <p className="text-green-600 dark:text-green-400 text-sm mb-4">{message}</p>}

          {!showPayment ? (
            <Button onClick={handleProceed} fullWidth disabled={amountCents < 500}>
              {amountCents >= 500 ? `Donate R${(amountCents / 100).toFixed(2)}` : 'Select an amount'}
            </Button>
          ) : (
            <PaystackCheckout
              email={user?.email}
              amountCents={amountCents}
              reference={reference}
              metadata={{ orderType: 'donation', orderId: donationId, donorUid: user?.uid }}
              onSuccess={() => {
                setMessage('Thank you for your generous donation!');
                setShowPayment(false);
                setSelectedAmount(null);
                setCustomAmount('');
              }}
              onError={(err) => {
                setError(err?.message || 'Payment failed. Please try again.');
                setShowPayment(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
