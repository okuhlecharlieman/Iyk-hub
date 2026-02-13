import Link from 'next/link';
import { FaCode, FaMusic, FaPaintBrush, FaThumbsUp, FaEdit, FaTrash } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const typeMetadata = {
  code: { icon: <FaCode />, color: 'text-blue-400' },
  music: { icon: <FaMusic />, color: 'text-emerald-400' },
  art: { icon: <FaPaintBrush />, color: 'text-violet-400' },
};

export const PostCardSkeleton = () => (
    <div className="bg-white/50 dark:bg-gray-800/50 shadow-lg rounded-2xl overflow-hidden animate-pulse border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="h-48 bg-gray-200 dark:bg-gray-700/80"></div>
        <div className="p-5">
            <div className="flex items-center mb-4">
                <div className="w-11 h-11 rounded-full bg-gray-300 dark:bg-gray-600/80 mr-3"></div>
                <div>
                    <div className="h-4 w-28 bg-gray-300 dark:bg-gray-600/80 rounded"></div>
                    <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600/80 rounded mt-2"></div>
                </div>
            </div>
            <div className="h-5 w-4/5 bg-gray-300 dark:bg-gray-600/80 rounded mb-2"></div>
            <div className="h-4 w-full bg-gray-300 dark:bg-gray-600/80 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600/80 rounded mt-1.5"></div>
             <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="h-6 w-12 bg-gray-300 dark:bg-gray-600/80 rounded"></div>
                <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600/80 rounded"></div>
            </div>
        </div>
    </div>
);


export default function PostCard({ post, author, isOwner, onEdit, onDelete, onVote }) {
  const { user: currentUser } = useAuth();
  const { type, title, description, mediaUrl, link, createdAt, votes, voters } = post;
  const metadata = typeMetadata[type] || {};
  const voteCount = votes || 0;
  const userHasVoted = currentUser && voters?.includes(currentUser.uid);

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 shadow-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col h-full backdrop-blur-sm">
      {mediaUrl && (
        <div className="relative w-full aspect-video overflow-hidden group">
          {type === 'art' && <img src={mediaUrl} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
          {type === 'music' && (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                 <audio controls src={mediaUrl} className="w-full">Your browser does not support audio.</audio>
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {author?.photoURL ? (
                <img src={author.photoURL} alt={author.displayName} className="w-11 h-11 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" />
            ) : (
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-50 leading-tight">{author?.displayName || 'Anonymous User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{createdAt ? new Date(createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</p>
            </div>
          </div>
          <div className={`text-xl p-3 bg-gray-100 dark:bg-gray-900/60 rounded-lg ${metadata.color}`}>
            {metadata.icon || null}
          </div>
        </div>

        <div className="flex-grow mb-4">
            <h3 className="font-bold text-lg leading-snug text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{description?.substring(0, 100)}{description && description.length > 100 && '...'}</p>
        </div>

        {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 hover:underline font-medium mb-4 group">
                <FiExternalLink className="group-hover:translate-x-1 transition-transform"/> <span>View Project</span>
            </a>
        )}

        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button onClick={onVote} className={`flex items-center gap-2 transition-colors duration-200 group ${userHasVoted ? 'text-blue-500 dark:text-blue-400' : 'hover:text-blue-400'}`}>
                <FaThumbsUp /> 
                <span className={`font-semibold text-sm`}>{voteCount}</span>
            </button>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1">
              <button onClick={onEdit} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/50 hover:text-blue-500 dark:hover:bg-gray-700/50 transition-colors"><FaEdit /></button>
              <button onClick={onDelete} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/50 hover:text-red-500 dark:hover:bg-gray-700/50 transition-colors"><FaTrash /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
