'use client';
import { GiSwordman, GiTicTacToe, GiCardRandom, GiHanger, GiBrain, GiVideoCamera } from 'react-icons/gi';
import { FaCopy, FaCheck } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const GAME_DETAILS = {
  rps: {
    name: 'Rock-Paper-Scissors',
    icon: <GiSwordman size={40} />,
    description: 'Classic hand game of strategy and luck.',
    color: 'from-orange-500 to-red-500',
  },
  tictactoe: {
    name: 'Tic-Tac-Toe',
    icon: <GiTicTacToe size={40} />,
    description: 'A simple but strategic grid game.',
    color: 'from-blue-500 to-indigo-500',
  },
  memory: {
    name: 'Memory Match',
    icon: <GiCardRandom size={40} />,
    description: 'Test your memory by matching pairs.',
    color: 'from-green-500 to-teal-500',
  },
  hangman: {
    name: 'Hangman',
    icon: <GiHanger size={40} />,
    description: 'Guess the word before time runs out.',
    color: 'from-purple-500 to-pink-500',
  },
  quiz: {
    name: 'Kasi Quiz',
    icon: <GiBrain size={40} />,
    description: 'Test your knowledge on various topics.',
    color: 'from-yellow-500 to-orange-500',
  },
  randomchat: {
    name: 'Random Video Chat',
    icon: <GiVideoCamera size={40} />,
    description: 'Hop into a random video chat room.',
    color: 'from-pink-500 to-purple-500',
  },
};

export default function GameCard({ gameId }) {
  const details = GAME_DETAILS[gameId];
  const router = useRouter();
  const [joinGameId, setJoinGameId] = useState('');
  const [lastCreatedId, setLastCreatedId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateSession = () => {
    if (gameId === 'randomchat') {
      router.push('/video');
    } else {
      const newGameId = `${gameId}-${Date.now()}`;
      setLastCreatedId(newGameId);
      router.push(`/games/${newGameId}`);
    }
  };

  const handleJoinGame = () => {
    if (joinGameId.trim()) {
      router.push(`/games/${joinGameId.trim()}`);
    }
  };

  const handleCopyId = async () => {
    if (lastCreatedId) {
      try {
        await navigator.clipboard.writeText(lastCreatedId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const isRandomChat = gameId === 'randomchat';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
      <div className={`h-2 bg-gradient-to-r ${details.color}`} />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-white bg-gradient-to-br ${details.color} p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform`}>
            {details.icon}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{details.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{details.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCreateSession}
            className={`bg-gradient-to-r ${details.color} hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md`}
          >
            {isRandomChat ? 'Join Random Chat' : 'Create New Game'}
          </button>
          {lastCreatedId && (
            <button
              onClick={handleCopyId}
              className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 py-1 transition-colors"
            >
              {copied ? <><FaCheck className="text-green-500" /> Copied!</> : <><FaCopy /> Copy Room ID</>}
            </button>
          )}
          {!isRandomChat && (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
                placeholder="Enter Room ID to Join"
                className="flex-grow p-2.5 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
              />
              <button
                onClick={handleJoinGame}
                disabled={!joinGameId.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl transition-colors"
              >
                Join
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
