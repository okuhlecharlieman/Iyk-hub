import Link from 'next/link';
import { FaCode, FaMusic, FaPaintBrush, FaThumbsUp, FaComment, FaEdit, FaTrash } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';

const typeMetadata = {
  code: { icon: <FaCode />, color: '#3b82f6' }, // Blue
  music: { icon: <FaMusic />, color: '#10b981' }, // Emerald
  art: { icon: <FaPaintBrush />, color: '#8b5cf6' }, // Violet
};

export const PostCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
        <div className="p-4 sm:p-5">
            <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"></div>
                <div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
                </div>
            </div>
            <div className="h-5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
        </div>
    </div>
);

export default function PostCard({ post, author, isOwner, onEdit, onDelete, onVote }) {
  const { type, title, description, mediaUrl, link, createdAt, uid, votes } = post;
  const metadata = typeMetadata[type] || {};

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-xl flex flex-col">
      {/* Media Section */}
      {mediaUrl && (
        <div className="relative w-full aspect-video overflow-hidden">
          {type === 'art' && <img src={mediaUrl} alt={title} className="w-full h-full object-cover" />}
          {type === 'music' && <audio controls src={mediaUrl} className="w-full absolute bottom-0">Your browser does not support audio.</audio>}
        </div>
      )}

      <div className="p-4 sm:p-5 flex-grow flex flex-col">
        {/* Author & Type Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            {author?.photoURL && (
                <img src={author.photoURL} alt={author.displayName} className="w-11 h-11 rounded-full mr-3 object-cover border-2 border-gray-100 dark:border-gray-700" />
            )}
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{author?.displayName || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(createdAt?.seconds * 1000).toLocaleDateString()}</p>
            </div>
          </div>
          <div style={{ color: metadata.color }} className="text-xl p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {metadata.icon || null}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-grow">
            <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{description}</p>
        </div>

        {/* Link Section */}
        {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 hover:underline mb-3">
                <FiExternalLink /> View Project
            </a>
        )}

        {/* Actions Section */}
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <button onClick={onVote} className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
                <FaThumbsUp className={`group-hover:text-blue-500 ${votes > 0 ? 'text-blue-600' : ''}`} /> 
                <span className={`font-semibold ${votes > 0 ? 'text-blue-600' : ''}`}>{votes || 0}</span>
            </button>
          </div>
          {isOwner && (
            <div className="flex items-center space-x-1">
              <button onClick={onEdit} className="hover:text-blue-500 p-2 rounded-full transition-colors"><FaEdit /></button>
              <button onClick={onDelete} className="hover:text-red-500 p-2 rounded-full transition-colors"><FaTrash /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
