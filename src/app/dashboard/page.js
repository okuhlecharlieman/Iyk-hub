'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { fetchLatestQuote, listApprovedOpportunities } from '../../lib/firebaseHelpers';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [opps, setOpps] = useState([]);

  useEffect(() => {
    async function load() {
      const q = await fetchLatestQuote();
      setQuote(q);
      const list = await listApprovedOpportunities(3);
      setOpps(list);
    }
    load();
  }, []);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold">Welcome{user?.displayName ? `, ${user.displayName}` : ''} 👋</h1>
          <p className="mt-2 text-neutral-600">{quote?.text || 'Have a great day!'}</p>
        </div>

        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Quick Games</h2>
            <Link className="text-sm underline" href="/games">See all</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'rps', name: 'Rock-Paper-Scissors' },
              { id: 'tictactoe', name: 'Tic-Tac-Toe' },
              { id: 'memory', name: 'Memory Match' },
              { id: 'hangman', name: 'Hangman' },
            ].map((g) => (
              <Link key={g.id} href={`/games/${g.id}`} className="border rounded p-4 hover:bg-neutral-50">
                {g.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Opportunities</h2>
            <Link className="text-sm underline" href="/opportunities">View board</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {opps.length === 0 ? <p className="text-neutral-500">No opportunities yet.</p> : null}
            {opps.map((o) => (
              <a key={o.id} href={o.link} target="_blank" className="border rounded p-4 hover:bg-neutral-50">
                <p className="font-medium">{o.title}</p>
                <p className="text-sm text-neutral-600">{o.org}</p>
                <p className="text-sm mt-1">{o.description?.slice(0, 100)}{o.description?.length > 100 ? '…' : ''}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}