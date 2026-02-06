import Link from 'next/link';
import { GiSwordman, GiTicTacToe, GiCardRandom, GiHanger, GiBrain } from 'react-icons/gi';

const GAME_DETAILS = {
  rps: { 
    name: 'Rock-Paper-Scissors', 
    icon: <GiSwordman size={40} />,
    description: 'Classic hand game of strategy and luck.'
  },
  tictactoe: { 
    name: 'Tic-Tac-Toe', 
    icon: <GiTicTacToe size={40} />,
    description: 'A simple but strategic grid game.'
  },
  memory: { 
    name: 'Memory Match', 
    icon: <GiCardRandom size={40} />,
    description: 'Test your memory by matching pairs.'
  },
  hangman: { 
    name: 'Hangman', 
    icon: <GiHanger size={40} />,
    description: 'Guess the word before time runs out.'
  },
  quiz: { 
    name: 'Kasi Quiz', 
    icon: <GiBrain size={40} />,
    description: 'Test your knowledge on various topics.'
  },
};

export default function GameCard({ gameId }) {
  const details = GAME_DETAILS[gameId];

  return (
    <Link 
      href={`/games/${gameId}`}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out group"
    >
      <div className="flex items-center gap-5">
        <div className="text-blue-500 dark:text-blue-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
          {details.icon}
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-white">{details.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{details.description}</p>
        </div>
      </div>
    </Link>
  );
}
