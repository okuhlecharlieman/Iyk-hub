'use client';
import { useEffect, useState } from 'react';
import { listTopUsers } from '../../lib/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Podium from '../../components/Podium';
import LeaderboardItem from '../../components/LeaderboardItem';
import { FaSync } from 'react-icons/fa';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('lifetime'); // 'lifetime' or 'weekly'

  useEffect(() => {
    // Ensure this runs only in the browser
    if (typeof window !== 'undefined') {
      const load = async () => {
        setLoading(true);
        setError("");
        try {
          const top = await listTopUsers(20, filter);
          setUsers(top);
        } catch (err) {
          if (err?.message?.includes("index")) {
            setError("Leaderboard unavailable: Firestore index missing. Please contact admin.");
          } else if (err?.message?.toLowerCase().includes("permission")) {
            setError("Leaderboard unavailable: Permission denied. Please contact admin.");
          } else {
            setError("Unable to load leaderboard. Please try again later.");
          }
        }
        setLoading(false);
      };
      load();
    }
  }, [filter]);

  const topThree = users.slice(0, 3);
  const restOfUsers = users.slice(3);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">See who is leading the ranks!</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${filter === 'lifetime' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setFilter('lifetime')}
              >
                All Time
              </button>
              <button
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${filter === 'weekly' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setFilter('weekly')}
              >
                This Week
              </button>
            </div>
            <button
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors" 
              onClick={() => {if (typeof window !== 'undefined') {load()}}} 
              disabled={loading}
              aria-label="Refresh leaderboard"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? <LoadingSpinner /> :
            error ? <div className="text-red-500 text-center py-10">{error}</div> :
            users.length > 0 ? (
              <>
                <Podium users={topThree} filter={filter} />
                <ol className="space-y-4 mt-8">
                  {restOfUsers.map((u, idx) => (
                    <LeaderboardItem key={u.id} user={u} rank={idx + 4} filter={filter} />
                  ))}
                </ol>
              </> 
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">The leaderboard is empty. Start playing to get on the board!</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
