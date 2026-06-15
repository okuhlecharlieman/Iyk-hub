/**
 * PostCard — renders a single showcase post with voting, media preview, and actions.
 * Author accent color (from active ULTRA boost) is applied to the avatar and name.
 * Voting uses optimistic UI with Firestore listeners for real-time updates.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaCode, FaMusic, FaPaintBrush, FaGamepad, FaPencilRuler, FaEllipsisH, FaThumbsUp, FaFire, FaHeart, FaEdit, FaTrash, FaPlay } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { togglePostVote } from '../../lib/firebase/helpers';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import BoostBadge from '../BoostBadge';

const typeMetadata = {
  code: { icon: <FaCode />, color: 'text-blue-400' },
  music: { icon: <FaMusic />, color: 'text-emerald-400' },
  art: { icon: <FaPaintBrush />, color: 'text-violet-400' },
  game: { icon: <FaGamepad />, color: 'text-orange-400' },
  design: { icon: <FaPencilRuler />, color: 'text-pink-400' },
  other: { icon: <FaEllipsisH />, color: 'text-gray-400' },
};

/** Fetches/retrieves data — getMediaType. */
function getMediaType(url) {
  if (!url) return null;
  const lower = url.toLowerCase().split('?')[0];
  if (/\.(mp4|webm|mov|avi|mkv)$/.test(lower) || lower.includes('video')) return 'video';
  if (/\.(mp3|wav|ogg|aac|flac|m4a)$/.test(lower) || lower.includes('audio')) return 'audio';
  return 'image';
}

/** PostCardSkeleton — card display component. */
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


/** PostCard — card display component. */
export default function PostCard({ post, isOwner, isAdmin, onEdit, onDelete, onVote }) {
  const { user: currentUser } = useAuth();
  const { type, title, description, mediaUrl, link, createdAt, votes, voters, fireCount, fireVoters, heartCount, heartVoters, authorName, authorPhoto, author } = post;
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = typeMetadata[type] || {};
  const [reactionState, setReactionState] = useState({
    thumbsUp: {
      count: Array.isArray(voters) ? voters.length : votes || 0,
      voters: voters || [],
    },
    fire: {
      count: Array.isArray(fireVoters) ? fireVoters.length : fireCount || 0,
      voters: fireVoters || [],
    },
    heart: {
      count: Array.isArray(heartVoters) ? heartVoters.length : heartCount || 0,
      voters: heartVoters || [],
    },
  });
  const [busyReaction, setBusyReaction] = useState(null);
  const userId = currentUser?.uid;

  // Real-time listener for reaction updates
  useEffect(() => {
    if (!post.id) return;
    const postRef = doc(db, 'wallPosts', post.id);
    const unsubscribe = onSnapshot(postRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const d = snapshot.data();
      setReactionState({
        thumbsUp: {
          count: Array.isArray(d.voters) ? d.voters.length : d.votes || 0,
          voters: d.voters || [],
        },
        fire: {
          count: Array.isArray(d.fireVoters) ? d.fireVoters.length : d.fireCount || 0,
          voters: d.fireVoters || [],
        },
        heart: {
          count: Array.isArray(d.heartVoters) ? d.heartVoters.length : d.heartCount || 0,
          voters: d.heartVoters || [],
        },
      });
    }, (err) => {
      // Fallback to prop-based state on listener error
      console.error('PostCard snapshot error:', err);
    });
    return () => unsubscribe();
  }, [post.id]);

  /** Handles reaction action. */
  const handleReaction = async (reactionType) => {
    if (!userId || busyReaction) return;
    setBusyReaction(reactionType);
    const currentReaction = reactionState[reactionType];
    const hasReacted = currentReaction.voters.includes(userId);

    try {
      await togglePostVote(post.id, userId, reactionType);
      const nextVoters = hasReacted
        ? currentReaction.voters.filter((uid) => uid !== userId)
        : [...currentReaction.voters, userId];

      setReactionState((prev) => ({
        ...prev,
        [reactionType]: {
          count: nextVoters.length,
          voters: nextVoters,
        },
      }));
    } catch (error) {
      console.error('Reaction failed', error);
    } finally {
      setBusyReaction(null);
    }
  };
  const authorInfo = author || {};
  const displayName = authorName || authorInfo.displayName || 'Anonymous User';
  const profilePhoto = authorPhoto || authorInfo.photoURL || null;
  const createdAtDate = createdAt && createdAt.seconds
    ? new Date(createdAt.seconds * 1000)
    : createdAt
      ? new Date(createdAt)
      : null;

  const isLongDescription = description && description.length > 100;

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 shadow-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col h-full backdrop-blur-sm">
      {mediaUrl && (() => {
        const mType = getMediaType(mediaUrl);
        return (
          <div className="relative w-full aspect-video overflow-hidden group">
            {mType === 'video' ? (
              <video controls src={mediaUrl} className="w-full h-full object-cover" preload="metadata">
                Your browser does not support video.
              </video>
            ) : mType === 'audio' ? (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3 px-4">
                <FaPlay className="text-3xl text-white/60" />
                <audio controls src={mediaUrl} className="w-full max-w-xs">Your browser does not support audio.</audio>
              </div>
            ) : (
              <img src={mediaUrl} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            )}
          </div>
        );
      })()}

      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <Link href={`/u/${post.uid}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {profilePhoto ? (
                <img src={profilePhoto} alt={displayName} className="w-11 h-11 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" style={post.accentColor ? { borderColor: post.accentColor } : {}} />
            ) : (
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-50 leading-tight flex items-center gap-1.5" style={post.accentColor ? { color: post.accentColor } : {}}>
                {displayName}
                {post.boostBadge && <BoostBadge badge={post.boostBadge.badge} label={post.boostBadge.badgeLabel} inline />}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{createdAtDate ? createdAtDate.toLocaleDateString() : 'Just now'}</p>
            </div>
          </Link>
          <div className={`text-xl p-3 bg-gray-100 dark:bg-gray-900/60 rounded-lg ${metadata.color}`}>
            {metadata.icon || null}
          </div>
        </div>

        <div className="flex-grow mb-4">
            <h3 className="font-bold text-lg leading-snug text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">
                {isExpanded ? description : `${description?.substring(0, 100) || ''}${isLongDescription ? '...' : ''}`}
            </p>
            {isLongDescription && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-blue-500 dark:text-blue-400 text-sm font-semibold mt-2">
                    {isExpanded ? 'Show Less' : 'Show More'}
                </button>
            )}
        </div>

        {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 hover:underline font-medium mb-4 group">
                <FiExternalLink className="group-hover:translate-x-1 transition-transform"/> <span>View Project</span>
            </a>
        )}

        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReaction('thumbsUp')}
              disabled={!userId || busyReaction === 'thumbsUp'}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 ${userId && reactionState.thumbsUp.voters.includes(userId) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/40'}`}
            >
              <FaThumbsUp />
              <span className="font-semibold text-sm">{reactionState.thumbsUp.count}</span>
            </button>
            <button
              onClick={() => handleReaction('fire')}
              disabled={!userId || busyReaction === 'fire'}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 ${userId && reactionState.fire.voters.includes(userId) ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:text-gray-400 dark:hover:text-orange-400 dark:hover:bg-orange-900/40'}`}
            >
              <FaFire />
              <span className="font-semibold text-sm">{reactionState.fire.count}</span>
            </button>
            <button
              onClick={() => handleReaction('heart')}
              disabled={!userId || busyReaction === 'heart'}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 ${userId && reactionState.heart.voters.includes(userId) ? 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300' : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/40'}`}
            >
              <FaHeart />
              <span className="font-semibold text-sm">{reactionState.heart.count}</span>
            </button>
          </div>
          {(isOwner || isAdmin) && (
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit && onEdit(post)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/50 hover:text-blue-500 dark:hover:bg-gray-700/50 transition-colors"><FaEdit /></button>
              <button onClick={() => onDelete && onDelete(post.id)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/50 hover:text-red-500 dark:hover:bg-gray-700/50 transition-colors"><FaTrash /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
