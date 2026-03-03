'use client';
import { useState } from 'react';
import { FaThumbsUp, FaHeart, FaLaugh, FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';

// This is the component for each individual card in the showcase.
// It now includes a dropdown menu for editing and deleting posts.
export default function ContentCard({ p, react, onEdit, onDelete, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleReaction = (reactionType) => {
    if (react) {
      react(p.id, reactionType);
    }
  };

  const safeReactions = p.reactions || { likes: 0, hearts: 0, laughs: 0 };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-transform transform hover:scale-105 duration-300 relative">
      {/* Management Menu Dropdown */}
      {canManage && (
        <div className="absolute top-2 right-2">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white p-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <FaEllipsisV />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <FaEdit className="mr-3" /> Edit
                </button>
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <FaTrash className="mr-3" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-48 object-cover" />}
      <div className="p-6">
        <div className="flex items-center mb-4">
          {p.author?.photoURL ? (
            <img src={p.author.photoURL} alt={p.author.displayName} className="w-10 h-10 rounded-full mr-3" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"></div>
          )}
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{p.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">By {p.author?.displayName || 'Anonymous User'}</p>
          </div>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{p.description}</p>
        {react && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex space-x-4">
              <button onClick={() => handleReaction('likes')} className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400">
                <FaThumbsUp />
                <span className="text-sm">{safeReactions.likes}</span>
              </button>
              <button onClick={() => handleReaction('hearts')} className="flex items-center space-x-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400">
                <FaHeart />
                <span className="text-sm">{safeReactions.hearts}</span>
              </button>
              <button onClick={() => handleReaction('laughs')} className="flex items-center space-x-2 text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400">
                <FaLaugh />
                <span className="text-sm">{safeReactions.laughs}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
