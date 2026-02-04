import { FaTrophy } from 'react-icons/fa';

const PodiumPlace = ({ user, rank, filter }) => {
  const getPodiumClass = () => {
    switch (rank) {
      case 1: return 'bg-yellow-400 dark:bg-yellow-500 order-2 h-48';
      case 2: return 'bg-gray-300 dark:bg-gray-400 order-1 h-40';
      case 3: return 'bg-yellow-600 dark:bg-amber-700 order-3 h-32';
      default: return '';
    }
  };

  const getTrophyColor = () => {
    switch (rank) {
      case 1: return 'text-white dark:text-yellow-200';
      case 2: return 'text-gray-700 dark:text-gray-200';
      case 3: return 'text-yellow-200 dark:text-amber-300';
      default: return '';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-end p-4 rounded-t-xl w-1/3 shadow-lg ${getPodiumClass()}`}>
      <FaTrophy className={`text-4xl mb-2 ${getTrophyColor()}`} />
      <img src={user.photoURL || '/logo.png'} className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 shadow-xl" alt="avatar" />
      <p className="font-bold text-white dark:text-gray-100 mt-2 text-center truncate w-full">{user.displayName || 'Anonymous'}</p>
      <p className="font-extrabold text-2xl text-white dark:text-gray-100">{filter === 'weekly' ? (user.points?.weekly ?? 0) : (user.points?.lifetime ?? user.points ?? 0)}</p>
    </div>
  );
};

export default function Podium({ users, filter }) {
  const topThree = users.slice(0, 3);
  // Ensure there are always 3 items for the podium, even if empty
  const podiumUsers = [
    users.find(u => u.rank === 2),
    users.find(u => u.rank === 1),
    users.find(u => u.rank === 3),
  ];

  // Handle cases where some ranks might be missing
  if (users.length < 3) {
    if (!podiumUsers[0]) podiumUsers[0] = null; // 2nd
    if (!podiumUsers[1]) podiumUsers[1] = null; // 1st
    if (!podiumUsers[2]) podiumUsers[2] = null; // 3rd
  }

  return (
    <div className="flex items-end justify-center h-56 bg-gradient-to-t from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 rounded-b-lg shadow-inner gap-1">
      {podiumUsers.map((user, index) => {
        const rank = [2, 1, 3][index];
        // Render a placeholder if a user for that rank doesn't exist
        if (!user) {
          return <div key={`placeholder-${rank}`} className={`w-1/3 h-${[40, 48, 32][index]} bg-gray-200 dark:bg-gray-700/50 rounded-t-xl`}></div>;
        }
        return <PodiumPlace key={user.id} user={user} rank={rank} filter={filter} />;
      })}
    </div>
  );
}
