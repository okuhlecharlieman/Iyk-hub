/**
 * ContentCardx component.
 */
import { memo } from 'react';
import Link from 'next/link';
import { FaThumbsUp, FaFire, FaHeart, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { Code, Music, FileText, Gamepad2, Palette } from 'lucide-react';
import BoostBadge from './BoostBadge';

const TYPE_STYLES = {
  art: { icon: <FileText size={16} />, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  music: { icon: <Music size={16} />, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  code: { icon: <Code size={16} />, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  poem: { icon: <FileText size={16} />, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  game: { icon: <Gamepad2 size={16} />, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  design: { icon: <Palette size={16} />, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  other: { icon: <FileText size={16} />, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

/** ContentCard — card display component. */
function ContentCard({ p, react, onEdit, onDelete, canManage }) {
  const { icon, color, bg } = TYPE_STYLES[p.type] || TYPE_STYLES.art;
  const voteCount = Array.isArray(p.voters) ? p.voters.length : (p.votes ?? 0);
  const fireCount = Array.isArray(p.fireVoters) ? p.fireVoters.length : (p.fireCount ?? 0);
  const heartCount = Array.isArray(p.heartVoters) ? p.heartVoters.length : (p.heartCount ?? 0);
  const canReact = typeof react === 'function';
  /** Handles reaction action. */
  const handleReaction = (type) => {
    if (!canReact) return;
    react(p.id, type);
  };
  const createdDate = p.createdAt
    ? new Date(typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.seconds ? p.createdAt.seconds * 1000 : p.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 ease-in-out flex flex-col">
      {/* Image preview at top of card */}
      {p.mediaUrl && !p.mediaUrl.startsWith('data:') && (() => {
        const lower = p.mediaUrl.toLowerCase().split('?')[0];
        const isVideo = /\.(mp4|webm|mov|avi|mkv)$/.test(lower) || lower.includes('video');
        const isAudio = /\.(mp3|wav|ogg|aac|flac|m4a)$/.test(lower) || lower.includes('audio') || p.type === 'music';
        if (isAudio) {
          return (
            <div className="px-5 pt-4">
              <audio className="w-full" src={p.mediaUrl} controls />
            </div>
          );
        }
        if (isVideo) {
          return (
            <div className="relative w-full h-48 bg-gray-900 overflow-hidden">
              <video className="w-full h-full object-cover" src={p.mediaUrl} controls preload="metadata" />
            </div>
          );
        }
        return (
          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <img
              className="w-full h-full object-cover"
              src={p.mediaUrl}
              alt={p.title}
              loading="lazy"
              onError={(e) => {
                const container = e.target.parentElement;
                e.target.style.display = 'none';
                if (!container.querySelector('.img-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'img-fallback absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm';
                  fallback.textContent = 'Image unavailable';
                  container.appendChild(fallback);
                }
              }}
            />
          </div>
        );
      })()}

      <div className="p-5 flex-1 flex flex-col">
        {/* Author info */}
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/u/${p.uid}`} className="flex items-center gap-2 group">
            {p.author?.photoURL ? (
              <img
                src={p.author.photoURL}
                alt={p.author.displayName || 'User'}
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                style={p.accentColor ? { borderColor: p.accentColor } : {}}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {(p.author?.displayName || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1" style={p.accentColor ? { color: p.accentColor } : {}}>
                {p.author?.displayName || 'Anonymous'}
                {p.isBoosted && p.boostBadge && <BoostBadge badge={p.boostBadge.badge} label={p.boostBadge.badgeLabel} inline />}
              </p>
              {createdDate && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{createdDate}</p>
              )}
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
              {icon} {p.type?.charAt(0).toUpperCase() + p.type?.slice(1)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{p.title}</h3>

        {/* Description preview */}
        {p.description && <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-3">{p.description}</p>}

        {/* Code block */}
        {p.code && (
          <pre className="bg-gray-100 dark:bg-gray-900 text-xs font-mono p-3 rounded-lg overflow-auto max-h-32 mb-3">
            <code>{p.code}</code>
          </pre>
        )}

        {/* External link */}
        {p.link && (
          <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400 truncate max-w-full mb-3">
            {p.link}
          </a>
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />
      </div>

      {/* Card footer with reactions */}
      <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReaction('thumbsUp')}
              disabled={!canReact}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-all ${!canReact ? 'cursor-not-allowed opacity-70' : ''}`}
              title="Like"
            >
              <FaThumbsUp size={14} />
              <span className="font-medium text-sm">{voteCount}</span>
            </button>
            <button
              onClick={() => handleReaction('fire')}
              disabled={!canReact}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-600 hover:text-orange-500 hover:bg-orange-50 dark:text-gray-400 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 transition-all ${!canReact ? 'cursor-not-allowed opacity-70' : ''}`}
              title="Fire"
            >
              <FaFire size={14} />
              <span className="font-medium text-sm">{fireCount}</span>
            </button>
            <button
              onClick={() => handleReaction('heart')}
              disabled={!canReact}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all ${!canReact ? 'cursor-not-allowed opacity-70' : ''}`}
              title="Love"
            >
              <FaHeart size={14} />
              <span className="font-medium text-sm">{heartCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button onClick={onEdit} className="text-gray-400 hover:text-blue-500 transition-colors p-1" title="Edit">
                  <FaPencilAlt size={14} />
                </button>
                <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete">
                  <FaTrash size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ContentCard);
