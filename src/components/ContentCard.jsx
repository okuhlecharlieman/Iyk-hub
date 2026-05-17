import { memo } from 'react';
import Link from 'next/link';
import { FaThumbsUp, FaFire, FaHeart, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { Code, Music, FileText } from 'lucide-react';

const TYPE_STYLES = {
  art: { icon: <FileText size={20} />, color: 'text-purple-500', bg: 'bg-purple-100' },
  music: { icon: <Music size={20} />, color: 'text-green-500', bg: 'bg-green-100' },
  code: { icon: <Code size={20} />, color: 'text-blue-500', bg: 'bg-blue-100' },
  poem: { icon: <FileText size={20} />, color: 'text-orange-500', bg: 'bg-orange-100' },
};

function ContentCard({ p, react, onEdit, onDelete, canManage }) {
  const { icon, color, bg } = TYPE_STYLES[p.type] || TYPE_STYLES.art;
  const voteCount = Array.isArray(p.voters) ? p.voters.length : (p.votes ?? 0);
  const fireCount = Array.isArray(p.fireVoters) ? p.fireVoters.length : 0;
  const heartCount = Array.isArray(p.heartVoters) ? p.heartVoters.length : 0;
  const canReact = typeof react === 'function';
  const handleReaction = (type) => {
    if (!canReact) return;
    react(p.id, type);
  };
  const createdDate = p.createdAt
    ? new Date(typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.seconds ? p.createdAt.seconds * 1000 : p.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 ease-in-out">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${bg} ${color}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{p.title}</h3>
              <p className={`text-sm font-medium ${color}`}>{p.type?.toUpperCase()}</p>
            </div>
          </div>
          <Link href={`/profile/${p.uid}`} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Profile
          </Link>
        </div>

        {p.description && <p className="mt-4 text-gray-600 dark:text-gray-300 line-clamp-3">{p.description}</p>}
        
        {p.mediaUrl && (
          p.type === 'music' ? (
            <audio className="w-full mt-4" src={p.mediaUrl} controls />
          ) : (
            <img className="mt-4 rounded-xl max-h-80 w-full object-cover" src={p.mediaUrl} alt={p.title} />
          )
        )}
        
        {p.code && (
          <pre className="bg-gray-100 dark:bg-gray-900 text-sm font-mono p-4 rounded-lg mt-4 overflow-auto max-h-40">
            <code>{p.code}</code>
          </pre>
        )}

        {p.link && (
          <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400 truncate max-w-full">
            {p.link}
          </a>
        )}
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleReaction('thumbsUp')}
              disabled={!canReact}
              className={`flex items-center gap-1.5 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors ${!canReact ? 'cursor-not-allowed opacity-70' : ''}`}
              title="Like"
            >
              <FaThumbsUp size={14} />
              <span className="font-medium text-sm">{voteCount}</span>
            </button>
            <button
              onClick={() => handleReaction('fire')}
              disabled={!canReact}
              className={`flex items-center gap-1.5 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors ${!canReact ? 'cursor-not-allowed opacity-70' : ''}`}
              title="Fire"
            >
              <FaFire size={14} />
              <span className="font-medium text-sm">{fireCount}</span>
            </button>
            <button
              onClick={() => handleReaction('heart')}
              disabled={!canReact}
              className={`flex items-center gap-1.5 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors ${!canReact ? 'cursor-not-allowed opacity-70' : ''}`}
              title="Love"
            >
              <FaHeart size={14} />
              <span className="font-medium text-sm">{heartCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button onClick={onEdit} className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit">
                  <FaPencilAlt size={14} />
                </button>
                <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                  <FaTrash size={14} />
                </button>
              </>
            )}
          </div>
        </div>
        {(createdDate || p.author?.displayName) && (
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            {p.author?.displayName && <span>by {p.author.displayName}</span>}
            {createdDate && <span>{createdDate}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ContentCard);
