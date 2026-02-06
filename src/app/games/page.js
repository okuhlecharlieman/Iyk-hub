'use client';
import GameCard from '../../components/GameCard';

const GAMES = ['rps', 'tictactoe', 'memory', 'hangman', 'quiz'];

export default function GamesPage() {
  return (
    <div className="min-h-screen px-4 py-12 md:px-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Intwana Games</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Test your skills, challenge friends, and earn points!</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GAMES.map((gameId) => (
            <GameCard key={gameId} gameId={gameId} />
          ))}
        </div>
      </div>
    </div>
  );
}
