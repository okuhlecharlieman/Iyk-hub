// filepath: c:/Users/Okuhle/Desktop/Code/intwana-hub/src/app/leaderboard/page.js
'use client';
import { useEffect, useState } from 'react';
import { listTopUsers } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('lifetime'); // 'lifetime' or 'weekly'

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const top = await listTopUsers(20, filter); // Pass filter to helper
      setUsers(top);
      setError("");
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

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filter]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <div className="mb-4 flex gap-2">
        <button
          className={`px-3 py-1 rounded ${filter === 'lifetime' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setFilter('lifetime')}
        >
          All Time
        </button>
        <button
          className={`px-3 py-1 rounded ${filter === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setFilter('weekly')}
        >
          This Week
        </button>
        <button
          className="ml-auto underline text-blue-600"
          onClick={load}
        >
          Refresh
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {error && (
        <div className="text-red-600 text-sm mb-4">
          {error}
        </div>
      )}
      {!loading && !error && (
        <ol className="bg-white rounded shadow divide-y">
          {users.length === 0 && <li className="p-4 text-neutral-500">No users found.</li>}
          {users.map((u, idx) => (
            <li key={u.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 text-right">{idx + 1}.</span>
                <img src={u.photoURL || '/logo.png'} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
                <span className="font-medium">{u.displayName || 'Intwana'}</span>
              </div>
              <span className="font-mono">{filter === 'weekly' ? (u.points?.weekly ?? 0) : (u.points?.lifetime ?? u.points ?? 0)} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}