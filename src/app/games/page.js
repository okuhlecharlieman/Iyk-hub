'use client';
import Link from 'next/link';

const GAMES = [
  { id: 'rps', name: 'Rock-Paper-Scissors' },
  { id: 'tictactoe', name: 'Tic-Tac-Toe' },
  { id: 'memory', name: 'Memory Match' },
  { id: 'hangman', name: 'Hangman' },
  { id: 'quiz', name: 'Quiz' },
];

export default function GamesPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center px-2 py-8 md:py-16 bg-gradient-to-br from-teal-50 via-yellow-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <h2 className="text-2xl md:text-4xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
        Games
      </h2>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 md:p-8 mt-4 mb-8">
        <h1 className="text-2xl font-bold mb-4">Mini Games</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GAMES.map((g) => (
            <Link key={g.id} href={`/games/${g.id}`} className="border rounded p-4 hover:bg-neutral-50">
              {g.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}