'use client';
import { useEffect, useState } from 'react';
import { listTopUsers } from '../../lib/firebaseHelpers';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const top = await listTopUsers(20);
        setUsers(top);
        setError("");
      } catch (err) {
        if (err?.message?.includes("index")) {
          setError("Leaderboard unavailable: Firestore index missing. Please contact admin.");
        } else if (err?.message?.includes("permission")) {
          setError("Leaderboard unavailable: Permission denied. Please contact admin.");
        } else {
          setError("Unable to load leaderboard. Please try again later.");
        }
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      {error && (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      )}
      <ol className="bg-white rounded shadow divide-y">
        {users.map((u, idx) => (
          <li key={u.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 text-right">{idx + 1}.</span>
              <img src={u.photoURL || '/logo.png'} className="w-8 h-8 rounded-full object-cover" alt="" />
              <span className="font-medium">{u.displayName || 'Intwana'}</span>
            </div>
            <span className="font-mono">{u.points || 0} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}