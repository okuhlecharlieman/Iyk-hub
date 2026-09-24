/**
 * Games listing page — shows all available games as cards.
 * Order defined by the GAMES array. Each game supports single-player and multiplayer.
 *
 * Testers: Games are identified by their slug (e.g. 'scratchcard', 'quiz', 'hangman').
 * The scratchcard replaced the old spin wheel. Quiz and Hangman now pull content from
 * Firestore (gameContent/{type}/items) via the /api/games/content API.
 */
'use client';
import { useMemo, useState } from 'react';
import GameCard from '../../components/GameCard';
import UserRoomsList from '../../components/UserRoomsList';
import InstallButton from '../../components/InstallButton';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { FaGamepad, FaSearch, FaUsers } from 'react-icons/fa';

/** Game IDs rendered on the games listing page. Order determines display order. */
const GAMES = ['scratchcard', 'rps', 'tictactoe', 'memory', 'hangman', 'quiz', 'randomchat'];

/** GamesPage — main page component. */
export default function GamesPage() {
  const [search, setSearch] = useState('');

  const filteredGames = useMemo(() => {
    if (!search) return GAMES;
    const q = search.trim().toLowerCase();
    return GAMES.filter((g) => g.toLowerCase().includes(q));
  }, [search]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen pt-20 bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:py-8 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-full p-3 text-white shadow-lg">
                <FaGamepad className="h-8 w-8" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Intwana Games</h1>
              <InstallButton />
            </div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Test your skills, challenge friends, and earn points!</p>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex-1 w-full">
              <UserRoomsList />
            </div>
            <div className="relative w-full lg:w-64">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 rounded-2xl shadow-xl overflow-hidden text-white">
              <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <FaUsers className="text-emerald-300 text-2xl" />
                    <span className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Venue mode</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold">Live Quiz Night</h2>
                  <p className="mt-2 text-blue-100 max-w-2xl">Host a live quiz for your venue, share a four-digit room PIN, and keep the leaderboard moving round by round.</p>
                </div>
                <a href="/games/venue" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-emerald-50 transition-colors whitespace-nowrap">
                  Host or join a room
                </a>
              </div>
            </div>
            {filteredGames.map((gameId) => (
              <GameCard key={gameId} gameId={gameId} />
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="text-center py-16">
              <FaSearch className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No games found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
