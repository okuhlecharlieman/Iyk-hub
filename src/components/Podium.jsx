import { FaTrophy } from 'react-icons/fa';

const PodiumPlace = ({ user, rank, filter }) => {
  const getPodiumClass = () => {
    switch (rank) {
      case 1: return 'bg-yellow-400 order-2 h-40';
      case 2: return 'bg-gray-300 order-1 h-32';
      case 3: return 'bg-yellow-600 order-3 h-24';
      default: return '';
    }
  };

  const getTrophyColor = () => {
    switch (rank) {
      case 1: return 'text-white';
      case 2: return 'text-gray-600';
      case 3: return 'text-yellow-200';
      default: return '';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-end p-4 rounded-t-lg w-1/3 ${getPodiumClass()}`}>
      <FaTrophy className={`text-4xl mb-2 ${getTrophyColor()}`} />
      <img src={user.photoURL || '/logo.png'} className="w-16 h-16 rounded-full border-4 border-white shadow-lg" alt="avatar" />
      <p className="font-bold text-white mt-2 truncate">{user.displayName || 'Anonymous'}</p>
      <p className="font-extrabold text-2xl text-white">{filter === 'weekly' ? (user.points?.weekly ?? 0) : (user.points?.lifetime ?? user.points ?? 0)}</p>
    </div>
  );
};

export default function Podium({ users, filter }) {
  const topThree = users.slice(0, 3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean); // 2nd, 1st, 3rd

  return (
    <div className="flex items-end justify-center h-48 bg-gradient-to-t from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 rounded-b-lg shadow-inner">
      {podiumOrder.map((user, index) => {
        const rank = [2, 1, 3][index];
        return user ? <PodiumPlace key={user.id} user={user} rank={rank} filter={filter} /> : null;
      })}
    </div>
  );
}
