'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCreatorBoostPlan } from '../../lib/monetization/creator-boosts';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaystackCheckout from '../../components/PaystackCheckout';
import { FaCheck, FaRocket, FaStar, FaCrown, FaBolt } from 'react-icons/fa';

const PLAN_DETAILS = {
  lite: {
    icon: FaBolt,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-300 dark:border-blue-700',
    features: [
      'Profile shown higher in search for 24 hours',
      '1.2x visibility boost on your showcase posts',
      'Blue "Boosted" badge on your profile for 24h',
      'Your posts appear in "Featured" section',
    ],
    notIncluded: [
      'Extended video chat time',
      'Portfolio analytics',
      'Priority matchmaking',
      'Verified creator badge',
    ],
  },
  pro: {
    icon: FaStar,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-300 dark:border-purple-700',
    popular: true,
    features: [
      'Profile shown higher in search for 72 hours',
      '1.8x visibility boost on your showcase posts',
      'Purple "Pro Creator" badge on your profile',
      'Your posts appear in "Featured" section',
      'Extended video chat (3 min per call)',
      'Portfolio view count analytics',
      'Priority matchmaking in video chat',
    ],
    notIncluded: [
      'Verified creator badge',
      'Early sponsor opportunities access',
    ],
  },
  ultra: {
    icon: FaCrown,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-300 dark:border-amber-700',
    features: [
      'Profile shown higher in search for 7 days',
      '2.5x visibility boost on your showcase posts',
      'Gold "Verified Creator" badge on your profile',
      'Your posts pinned in "Featured" section',
      'Extended video chat (5 min per call)',
      'Full portfolio analytics with engagement stats',
      'Priority matchmaking in video chat',
      'Early access to sponsor opportunities',
      'Profile featured on homepage carousel',
      'Custom profile accent color',
    ],
    notIncluded: [],
  },
};

function buildPlanList() {
  return Object.entries({
    lite: getCreatorBoostPlan('lite'),
    pro: getCreatorBoostPlan('pro'),
    ultra: getCreatorBoostPlan('ultra'),
  });
}

export default function CreatorBoostsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

  const handleBoost = async (planKey) => {
    if (!user) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    setPaymentInfo(null);

    try {
      const res = await fetch('/api/creator-boosts/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ plan: planKey, targetType: 'profile', targetId: user.uid }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create boost order');
      }

      const plan = getCreatorBoostPlan(planKey);
      setPaymentInfo({
        orderId: json.orderId,
        amountCents: plan.feeCents,
        reference: `boost-${json.orderId}-${Date.now()}`,
        email: user.email,
      });
      setMessage(`Boost order created (ID: ${json.orderId}). Complete payment below.`);
    } catch (err) {
      console.error('Boost purchase error:', err);
      setError(err.message || 'Failed to create boost order');
    } finally {
      setLoading(false);
    }
  };

  const planItems = buildPlanList();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-3 text-white shadow-lg">
              <FaRocket className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Creator Boosts
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Stand out from the crowd. Each boost tier gives you exclusive features that help you get noticed, grow your audience, and connect faster.
          </p>
        </div>

        {/* Free tier baseline */}
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 inline-block px-4 py-2 rounded-full">
            🆓 <strong>Free account:</strong> 5 showcase posts · 60s video chat · Basic profile · Weekly leaderboard
          </p>
        </div>

        {!user ? (
          <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/40 p-6 max-w-md mx-auto text-center">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Please log in to purchase a boost.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {planItems.map(([key, plan]) => {
              const details = PLAN_DETAILS[key];
              const Icon = details.icon;
              return (
                <div key={key} className={`relative p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 ${details.borderColor} shadow-lg flex flex-col`}>
                  {details.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`bg-gradient-to-br ${details.color} rounded-full p-2 text-white`}>
                      <Icon className="text-lg" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.label}</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.durationHours}h duration · ×{plan.visibilityMultiplier} visibility</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">R{(plan.feeCents / 100).toFixed(0)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">one-time</span>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-6">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">What you get:</p>
                    <ul className="space-y-2">
                      {details.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <FaCheck className="text-green-500 mt-0.5 flex-shrink-0 text-xs" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => handleBoost(key)}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? 'Processing…' : `Get ${plan.label}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {message && <div className="mt-6 rounded-lg bg-green-50 dark:bg-green-900/30 p-4 text-green-800 dark:text-green-200 max-w-lg mx-auto">{message}</div>}
        {error && <div className="mt-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-red-800 dark:text-red-200 max-w-lg mx-auto">{error}</div>}

        {paymentInfo && (
          <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg max-w-lg mx-auto">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Complete Payment</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Amount: R{(paymentInfo.amountCents / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <PaystackCheckout
              email={paymentInfo.email}
              amountCents={paymentInfo.amountCents}
              reference={paymentInfo.reference}
              metadata={{ orderId: paymentInfo.orderId, orderType: 'creatorBoost' }}
              onSuccess={() => {
                setMessage('Payment successful! Your boost is now active.');
                setPaymentInfo(null);
              }}
              onError={(err) => {
                setError(err.message || 'Payment failed. Please try again.');
              }}
            />
          </div>
        )}

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" /> <span className="text-gray-600 dark:text-gray-300">Submitting order...</span>
          </div>
        )}
      </div>
    </div>
  );
}
