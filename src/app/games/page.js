'use client';
import { useMemo, useState } from 'react';
import GameCard from '../../components/GameCard';
import UserRoomsList from '../../components/UserRoomsList';

const GAMES = ['rps', 'tictactoe', 'memory', 'hangman', 'quiz', 'randomchat'];

export default function GamesPage() {
  const [search, setSearch] = useState('');

  const filteredGames = useMemo(() => {
    if (!search) return GAMES;
    const q = search.trim().toLowerCase();
    return GAMES.filter((g) => g.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="min-h-screen px-4 py-12 md:px-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Intwana Games</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Play solo or multiplayer, challenge friends, and earn boosted points for wins.</p>
        </div>

        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-100">
          <p><strong>Scoring:</strong> Multiplayer wins give higher rewards. Solo wins still earn points and practice progress.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <UserRoomsList />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
            className="w-full sm:w-64 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGames.map((gameId) => (
            <GameCard key={gameId} gameId={gameId} />
          ))}
        </div>
      </div>
    </div>
  );
}
