'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { fetchLatestQuote, listApprovedOpportunities } from '../../lib/firebaseHelpers';
import Link from 'next/link';
import { FaArrowRight, FaGamepad, FaBriefcase } from 'react-icons/fa';

import PointsCard from '../../components/PointsCard';
import LeaderboardPreview from '../../components/LeaderboardPreview';
import OnlineCount from '../../components/OnlineCount';
import { GiSword, GiTicTacToe, GiCardRandom, GiHangman } from 'react-icons/gi';

const GAME_ICONS = {
  rps: <GiSword size={32} />,
  tictactoe: <GiTicTacToe size={32} />,
  memory: <GiCardRandom size={32} />,
  hangman: <GiHangman size={32} />,
};

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8 md:px-8 md:py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 dark:from-blue-700 dark:to-teal-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Welcome{user?.displayName ? `, ${user.displayName}` : ''} 👋
                </h1>
                <p className="mt-2 text-blue-100 max-w-2xl">
                  {quote?.text ? <em>“{quote.text}”</em> : 'Your journey to greatness starts now. Let’s make today count!'}
                </p>
              </div>
              <OnlineCount />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Quick Games */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><FaGamepad /> Quick Games</h2>
                  <Link className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400" href="/games">See all <FaArrowRight className="inline" /></Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'rps', name: 'Rock-Paper-Scissors' },
                    { id: 'tictactoe', name: 'Tic-Tac-Toe' },
                    { id: 'memory', name: 'Memory Match' },
                    { id: 'hangman', name: 'Hangman' },
                  ].map((g) => (
                    <Link key={g.id} href={`/games/${g.id}`} 
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center text-center">
                      <div className="text-blue-500 dark:text-blue-400 mb-2">{GAME_ICONS[g.id]}</div>
                      <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{g.name}</p>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Opportunities */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><FaBriefcase /> Opportunities</h2>
                  <Link className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400" href="/opportunities">View board <FaArrowRight className="inline" /></Link>
                </div>
                <div className="space-y-4">
                  {opps.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No opportunities at the moment. Check back soon!</p> : null}
                  {opps.map((o) => (
                    <a key={o.id} href={o.link} target="_blank" rel="noreferrer" 
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 block">
                      <h3 className="font-bold text-gray-800 dark:text-white">{o.title}</h3>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{o.org}</p>
                      <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                        {o.description?.slice(0, 120)}{o.description?.length > 120 ? '…' : ''}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-8">
              <PointsCard />
              <LeaderboardPreview weekly />
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
