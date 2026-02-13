'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Link from 'next/link';
import { FaTrophy } from 'react-icons/fa';

export default function LeaderboardPreview({ weekly = true }) {
  const [top, setTop] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsub;
    try {
      const usersCol = collection(db, 'users');
      const field = weekly ? 'points.weekly' : 'points.lifetime';
      const q = query(usersCol, orderBy(field, 'desc'), limit(5));
      unsub = onSnapshot(
        q,
        (snap) => {
          setTop(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setError("");
        },
        (err) => {
          setError(
            err?.message?.includes("index") ?
              "Leaderboard unavailable: Firestore index missing. Please contact admin." :
              "Unable to load leaderboard. Please try again later."
          );
        }
      );
    } catch (err) {
      setError("Leaderboard error: " + (err.message || "Unknown error"));
    }
    return () => unsub && unsub();
  }, [weekly]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <FaTrophy className="text-yellow-500" />
          Leaderboard {weekly ? '(This week)' : '(All time)'}
        </h2>
        <Link className="text-sm text-blue-600 hover:underline dark:text-blue-400" href="/leaderboard">View all</Link>
      </div>
      {error ? (
        <div className="text-red-600 dark:text-red-400 text-sm p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>
      ) : (
        <ul className="space-y-2">
          {top.length === 0 && <li className="text-gray-500 dark:text-gray-400 text-center py-4">No data yet. Be the first!</li>}
          {top.map((u, i) => (
            <li key={u.id} className="flex items-center justify-between p-3 rounded-lg transition-colors bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-500 dark:text-gray-400 w-6 text-center">{i + 1}</span>
                <img src={u.photoURL || '/logo.png'} className="h-9 w-9 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" alt="avatar" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{u.displayName || 'Player'}</span>
              </div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 py-1 px-3 rounded-full">
                {weekly ? u?.points?.weekly || 0 : u?.points?.lifetime || 0} pts
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}