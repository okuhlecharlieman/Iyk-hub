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
import { GiSwordman, GiTicTacToe, GiCardRandom, GiHanger, GiBrain } from 'react-icons/gi';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GAME_DETAILS = {
  rps: { name: 'Rock-Paper-Scissors', icon: <GiSwordman size={32} /> },
  tictactoe: { name: 'Tic-Tac-Toe', icon: <GiTicTacToe size={32} /> },
  memory: { name: 'Memory Match', icon: <GiCardRandom size={32} /> },
  hangman: { name: 'Hangman', icon: <GiHanger size={32} /> },
  quiz: { name: 'Quiz', icon: <GiBrain size={32} /> },
};

export default function GamePage() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const baseGameId = gameId.split('-')[0];

  async function finishGame(finalScore = 1, duration = 0) {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(finalScore),
      });

      const sessionsCollection = collection(db, 'sessions');
      await addDoc(sessionsCollection, {
        userId: user.uid,
        gameId: gameId,
        baseGameId: baseGameId,
        score: finalScore,
        duration: duration,
        completedAt: serverTimestamp(),
      });
      
      console.log(`Game session logged for user ${user.uid}. Score: ${finalScore}`);
    } catch (error) {
      console.error("Error updating points or logging session:", error);
    }
  }

  const GameComponent = useMemo(() => {
    const onEnd = (score) => finishGame(score);

    switch (baseGameId) {
      case 'tictactoe': return <XOGame gameId={gameId} onEnd={(res) => finishGame(res?.score || 5)} />;
      case 'rps': return <RPSGame gameId={gameId} onEnd={onEnd} />;
      case 'memory': return <MemoryGame onEnd={onEnd} />;
      case 'hangman': return <HangmanGame onEnd={onEnd} />;
      case 'quiz': return <QuizGame onEnd={onEnd} />;
      default: return null;
    }
  }, [gameId, user, baseGameId]);

  const gameDetails = GAME_DETAILS[baseGameId];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/games" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-medium">
              <FaArrowLeft className="mr-2" />
              Back to Games
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
              <div className="text-blue-500 dark:text-blue-400">
                {gameDetails?.icon}
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{gameDetails?.name || 'Game'}</h1>
            </div>
            <div className="p-6">
              {GameComponent ? GameComponent : 
                <div className="text-center py-10">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Game Not Found</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">The game you are looking for does not exist or is currently unavailable.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
