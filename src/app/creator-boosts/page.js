'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCreatorBoostPlan } from '../../lib/monetization/creator-boosts';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/LoadingSpinner';

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

  const handleBoost = async (planKey) => {
    if (!user) return;
    setError(null);
    setMessage(null);
    setLoading(true);

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

      setMessage(`Boost order created (ID: ${json.orderId}). Payment is pending.`);
    } catch (err) {
      console.error('Boost purchase error:', err);
      setError(err.message || 'Failed to create boost order');
    } finally {
      setLoading(false);
    }
  };

  const planItems = buildPlanList();

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-4">Creator Boosts</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        Boost your profile visibility with a paid promotion. Select a plan to get started.
      </p>

      {!user ? (
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/40 p-6">
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            Please log in to purchase a boost.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {planItems.map(([key, plan]) => (
            <div key={key} className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-semibold mb-1">{plan.label}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{plan.durationHours}h boost · ×{plan.visibilityMultiplier} visibility</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">R{(plan.feeCents / 100).toFixed(2)}</span>
                <span className="text-sm text-gray-500">one-time</span>
              </div>
              <Button
                onClick={() => handleBoost(key)}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Processing…' : 'Purchase Boost'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {message && <div className="mt-6 rounded-lg bg-green-50 dark:bg-green-900/30 p-4 text-green-800 dark:text-green-200">{message}</div>}
      {error && <div className="mt-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-red-800 dark:text-red-200">{error}</div>}

      {loading && (
        <div className="mt-6 flex items-center gap-2">
          <LoadingSpinner size="sm" /> <span>Submitting order...</span>
        </div>
      )}
    </div>
  );
}
