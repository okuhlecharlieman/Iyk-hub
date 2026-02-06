import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function PendingOppsCard({ opportunities, onApprove, onReject }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pending Opportunities</h2>
        <Link href="/admin/opportunities" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1">
          View all <FaArrowRight />
        </Link>
      </div>
      <div className="space-y-4">
        {opportunities.slice(0, 3).map(opp => (
          <div key={opp.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
            <p className="font-semibold text-gray-800 dark:text-gray-200">{opp.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{opp.org}</p>
            <div className="mt-2 space-x-2">
              <button onClick={() => onApprove(opp.id)} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-full">Approve</button>
              <button onClick={() => onReject(opp.id)} className="px-3 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-full">Reject</button>
            </div>
          </div>
        ))}
        {opportunities.length === 0 && <p className="text-gray-500 dark:text-gray-400">No pending opportunities.</p>}
      </div>
    </div>
  );
}
