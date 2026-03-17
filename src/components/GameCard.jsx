'use client';
import { GiSwordman, GiTicTacToe, GiCardRandom, GiHanger, GiBrain, GiVideoCamera } from 'react-icons/gi';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const GAME_DETAILS = {
  rps: {
    name: 'Rock-Paper-Scissors',
    icon: <GiSwordman size={40} />,
    description: 'Now supports solo vs CPU and multiplayer rooms.',
    supportsSinglePlayer: true,
    supportsMultiplayer: true,
  },
  tictactoe: {
    name: 'Tic-Tac-Toe',
    icon: <GiTicTacToe size={40} />,
    description: 'Classic strategic grid game in solo or PvP mode.',
    supportsSinglePlayer: true,
    supportsMultiplayer: true,
  },
  memory: {
    name: 'Memory Match',
    icon: <GiCardRandom size={40} />,
    description: 'Match cards and improve concentration.',
    supportsSinglePlayer: false,
    supportsMultiplayer: true,
  },
  hangman: {
    name: 'Hangman',
    icon: <GiHanger size={40} />,
    description: 'Guess the word before you run out of attempts.',
    supportsSinglePlayer: true,
    supportsMultiplayer: false,
  },
  quiz: {
    name: 'Kasi Quiz',
    icon: <GiBrain size={40} />,
    description: 'Quick quiz challenges with score rewards.',
    supportsSinglePlayer: true,
    supportsMultiplayer: false,
  },
  randomchat: {
    name: 'Random Video Chat',
    icon: <GiVideoCamera size={40} />,
    description: 'Hop into a random video chat room.',
    supportsSinglePlayer: false,
    supportsMultiplayer: false,
  },
};

export default function GameCard({ gameId }) {
  const details = GAME_DETAILS[gameId];
  const router = useRouter();
  const [joinGameId, setJoinGameId] = useState('');

  if (!details) return null;
  const isRandomChat = gameId === 'randomchat';

  const createSession = (mode = 'multiplayer') => {
    if (isRandomChat) {
      router.push('/video');
      return;
    }
    const suffix = mode === 'single' ? `solo-${Date.now()}` : Date.now();
    router.push(`/games/${gameId}-${suffix}?mode=${mode}`);
  };

  const joinMultiplayer = () => {
    if (joinGameId.trim()) {
      router.push(`/games/${joinGameId.trim()}?mode=multiplayer`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out group border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-5">
        <div className="text-blue-500 dark:text-blue-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-xl">
          {details.icon}
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-white">{details.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{details.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {details.supportsSinglePlayer && (
          <button onClick={() => createSession('single')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg">
            Single Player
          </button>
        )}
        {details.supportsMultiplayer && (
          <button onClick={() => createSession('multiplayer')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
            Multiplayer
          </button>
        )}
        {isRandomChat && (
          <button onClick={() => createSession('multiplayer')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
            Join Random Chat
          </button>
        )}
      </div>

      {details.supportsMultiplayer && !isRandomChat && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={joinGameId}
            onChange={(e) => setJoinGameId(e.target.value)}
            placeholder="Enter multiplayer room ID"
            className="flex-grow p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600"
          />
          <button onClick={joinMultiplayer} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg">
            Join
          </button>
        </div>
      )}
    </div>
  );
}
