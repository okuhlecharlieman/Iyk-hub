import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function LeaderboardCard({ users }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Leaderboard</h2>
        <Link href="/leaderboard" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1">
          Full board <FaArrowRight />
        </Link>
      </div>
      <ol className="space-y-3">
        {users.slice(0, 5).map((u, i) => (
          <li key={u.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-500 dark:text-gray-400 w-6">{i + 1}.</span>
              <img src={u.photoURL || '/logo.png'} alt={u.displayName} className="w-8 h-8 rounded-full" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">{u.displayName}</span>
            </div>
            <span className="font-bold text-blue-600 dark:text-blue-400">{u.points?.lifetime ?? 0}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
