'use client';
import Link from 'next/link';

const GAMES = [
  { id: 'rps', name: 'Rock-Paper-Scissors' },
  { id: 'tictactoe', name: 'Tic-Tac-Toe' },
  { id: 'memory', name: 'Memory Match' },
  { id: 'hangman', name: 'Hangman' },
  { id: 'quiz', name: 'Quiz' },
];

export default function GamesIndex() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Mini Games</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {GAMES.map((g) => (
          <Link key={g.id} href={`/games/${g.id}`} className="border rounded p-4 hover:bg-neutral-50">
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  );
}