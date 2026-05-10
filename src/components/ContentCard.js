'use client';
import Link from 'next/link';
import { FaThumbsUp, FaEdit, FaTrash } from 'react-icons/fa';

export default function ContentCard({ p, react, onEdit, onDelete, canManage }) {

  const handleReaction = () => {
    if (react) {
      react(p.id);
    }
  };

  const voteCount = p.votes ?? 0;
  const hasVoted = Array.isArray(p.voters) && typeof window !== 'undefined';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden relative">
      {/* Management Buttons */}
      {canManage && (
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          <button onClick={onEdit} className="p-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
            <FaEdit />
          </button>
          <button onClick={onDelete} className="p-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <FaTrash />
          </button>
        </div>
      )}

      {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-48 object-cover" />}
      
      <div className="p-6">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{p.title}</h3>
        
        {/* Clickable Author Info */}
        {p.uid && p.author ? (
            <Link href={`/profile/${p.uid}`} className="flex items-center mb-4 group cursor-pointer w-fit">
                {p.author.photoURL ? (
                    <img src={p.author.photoURL} alt={p.author.displayName} className="w-10 h-10 rounded-full mr-3" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3" />
                )}
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:underline">
                    By {p.author.displayName || 'Anonymous User'}
                    </p>
                </div>
            </Link>
        ) : (
            <div className="flex items-center mb-4">
                 <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3" />
                 <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">By Anonymous User</p>
                 </div>
            </div>
        )}

        <p className="text-gray-700 dark:text-gray-300 mb-4">{p.description}</p>

        {react && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
            <button onClick={handleReaction} className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              <FaThumbsUp />
              <span className="text-sm font-medium">{voteCount}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
