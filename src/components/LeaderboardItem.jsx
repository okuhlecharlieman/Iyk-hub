import { FaCrown } from 'react-icons/fa';

export default function LeaderboardItem({ user, rank, filter }) {
  const getRankIndicator = () => {
    if (rank <= 3) {
      const colors = {
        1: 'text-yellow-400',
        2: 'text-gray-400',
        3: 'text-yellow-600',
      };
      return <FaCrown className={`text-2xl ${colors[rank]}`} />;
    }
    return <span className="font-bold text-lg text-gray-500 dark:text-gray-400 w-6 text-center">{rank}</span>;
  };

  const cardStyle = `p-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 border dark:border-gray-700`;

  return (
    <li className={cardStyle}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-8 text-center">{getRankIndicator()}</div>
        <img src={user.photoURL || '/logo.png'} className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-gray-200 dark:border-gray-600" alt="avatar" />
        <div>
          <span className="font-semibold text-gray-800 dark:text-white text-base md:text-lg">{user.displayName || 'Anonymous User'}</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.title || 'Community Member'}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="font-bold text-xl md:text-2xl text-blue-600 dark:text-blue-400">{filter === 'weekly' ? (user.points?.weekly ?? 0) : (user.points?.lifetime ?? user.points ?? 0)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400"> points</span>
      </div>
    </li>
  );
}
