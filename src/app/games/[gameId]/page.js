'use client';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import XOGame from '../../../components/games/XOGame';
import RPSGame from '../../../components/games/RPSGame';
import MemoryGame from '../../../components/games/MemoryGame';
import HangmanGame from '../../../components/games/HangmanGame';
import QuizGame from '../../../components/games/QuizGame';
import { awardGamePoints, logGameSession } from '../../../lib/firebaseHelpers';

export default function GamePage() {
  const { gameId } = useParams();
  const { user } = useAuth();

  async function finishGame(finalScore = 1, duration = 0) {
    if (!user) return;
    try {
      await awardGamePoints(user.uid, gameId, finalScore);
      await logGameSession(user.uid, gameId, finalScore, duration);
      alert(`Nice! You earned ${finalScore} points for playing ${gameId}.`);
    } catch (error) {
      console.error("Failed to save game data:", error);
      alert("There was an error saving your score.");
    }
  }

  const Game = useMemo(() => {
    const onEnd = (score) => finishGame(score);

    switch (gameId) {
      case 'tictactoe':
        return <XOGame onEnd={(res) => finishGame(res?.score || 5)} />;
      case 'rps':
        return <RPSGame onEnd={onEnd} />;
      case 'memory':
        return <MemoryGame onEnd={onEnd} />;
      case 'hangman':
        return <HangmanGame onEnd={onEnd} />;
      case 'quiz':
        return <QuizGame onEnd={onEnd} />;
      default:
        return <p>Game not found.</p>;
    }
  }, [gameId, user]);

  return (
    <ProtectedRoute>
      <div className="min-h-[70vh] flex flex-col items-center px-2 py-8 md:py-16 bg-gradient-to-br from-blue-50 via-yellow-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 md:p-8 mt-4 mb-8">
          <h1 className="text-xl font-semibold mb-3 capitalize">{gameId}</h1>
          {Game}
        </div>
      </div>
    </ProtectedRoute>
  );
}
