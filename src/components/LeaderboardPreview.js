'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Link from 'next/link';

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
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Leaderboard {weekly ? '(This week)' : '(All time)'}</h2>
        <Link className="text-sm underline" href="/leaderboard">View all</Link>
      </div>
      {error ? (
        <div className="text-red-600 text-sm mb-2">{error}</div>
      ) : (
        <ul className="space-y-2">
          {top.length === 0 && <li className="text-neutral-500 text-sm">No data yet.</li>}
          {top.map((u, i) => (
            <li key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden" />
                <span className="text-sm font-medium">{u.displayName || 'Player'}</span>
              </div>
              <div className="text-sm font-semibold">
                {weekly ? u?.points?.weekly || 0 : u?.points?.lifetime || 0}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}