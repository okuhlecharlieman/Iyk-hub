import Link from 'next/link';
import { GiSwordman, GiTicTacToe, GiCardRandom, GiHanger, GiBrain } from 'react-icons/gi';

const GAME_DETAILS = {
  rps: { name: 'Rock-Paper-Scissors', icon: <GiSwordman size={48} /> },
  tictactoe: { name: 'Tic-Tac-Toe', icon: <GiTicTacToe size={48} /> },
  memory: { name: 'Memory Match', icon: <GiCardRandom size={48} /> },
  hangman: { name: 'Hangman', icon: <GiHanger size={48} /> },
  quiz: { name: 'Quiz', icon: <GiBrain size={48} /> },
};

export default function GameCard({ gameId }) {
  const details = GAME_DETAILS[gameId];

  return (
    <Link 
      href={`/games/${gameId}`}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out flex flex-col items-center justify-center text-center"
    >
      <div className="text-blue-500 dark:text-blue-400 mb-4">
        {details.icon}
      </div>
      <h3 className="font-bold text-lg text-gray-800 dark:text-white">{details.name}</h3>
    </Link>
  );
}
