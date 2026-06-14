'use client';
import { FaRocket, FaClock, FaHistory } from 'react-icons/fa';
import Link from 'next/link';

export function ActivePlanCard({ activeBoost }) {
  if (!activeBoost) return null;
  return (
    <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700/50">
      <div className="flex items-center gap-3 mb-3">
        <FaRocket className="text-purple-500 text-lg" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Plan</h3>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full font-semibold">{activeBoost.label || activeBoost.tier}</span>
        {activeBoost.expiresAt && (
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FaClock className="text-xs" />
            Expires: {new Date(activeBoost.expiresAt).toLocaleString()}
          </span>
        )}
      </div>
      <Link href="/creator-boosts" className="mt-3 inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">
        Renew or Upgrade
      </Link>
    </div>
  );
}

export function BoostHistoryList({ boostHistory }) {
  if (!boostHistory || boostHistory.length === 0) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <FaHistory className="text-gray-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Boost History</h3>
      </div>
      <div className="space-y-2">
        {boostHistory.slice(0, 5).map((order) => (
          <div key={order.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{order.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                order.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' :
                order.status === 'expired' ? 'bg-gray-100 text-gray-500 dark:bg-gray-600/40 dark:text-gray-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/40 dark:text-yellow-300'
              }`}>{order.status}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400">
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
