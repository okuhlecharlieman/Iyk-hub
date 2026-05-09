'use client';

import Link from 'next/link';
import { FaMoneyBillWave } from 'react-icons/fa';
import Button from '../ui/Button';

export default function PaymentsCard() {
  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Revenue Management</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Track all platform revenue streams and analyze financial performance.</p>
        </div>
        <div className="text-green-600 dark:text-green-300">
          <FaMoneyBillWave className="text-3xl" />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Link href="/creator-boosts">
          <Button variant="primary">View boost plans</Button>
        </Link>
        <Link href="/admin/payments" className="mt-2 sm:mt-0">
          <Button variant="secondary">Revenue dashboard</Button>
        </Link>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Monitor revenue by stream, filter by time period, and analyze business performance.</p>
    </div>
  );
}
