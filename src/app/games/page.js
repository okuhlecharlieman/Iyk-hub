'use client';
import { useMemo, useState } from 'react';
import GameCard from '../../components/GameCard';
import UserRoomsList from '../../components/UserRoomsList';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { FaGamepad, FaSearch } from 'react-icons/fa';

const GAMES = ['rps', 'tictactoe', 'memory', 'hangman', 'quiz', 'randomchat'];

export default function GamesPage() {
  const [search, setSearch] = useState('');

  const filteredGames = useMemo(() => {
    if (!search) return GAMES;
    const q = search.trim().toLowerCase();
    return GAMES.filter((g) => g.toLowerCase().includes(q));
  }, [search]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-full p-3 text-white shadow-lg">
                <FaGamepad className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Intwana Games</h1>
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
