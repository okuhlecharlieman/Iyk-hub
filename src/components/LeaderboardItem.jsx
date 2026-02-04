export default function LeaderboardItem({ user, rank, filter }) {
  const getRankColor = () => {
    switch (rank) {
      case 1: return 'border-yellow-400';
      case 2: return 'border-gray-300';
      case 3: return 'border-yellow-600';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <li className={`p-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 ${getRankColor()}`}>
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg text-gray-600 dark:text-gray-300 w-6 text-center">{rank}</span>
        <img src={user.photoURL || '/logo.png'} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="avatar" />
        <div>
          <span className="font-semibold text-gray-800 dark:text-white">{user.displayName || 'Anonymous User'}</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.title || 'Community Member'}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="font-bold text-xl text-blue-600 dark:text-blue-400">{filter === 'weekly' ? (user.points?.weekly ?? 0) : (user.points?.lifetime ?? user.points ?? 0)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400"> points</span>
      </div>
    </li>
  );
}
