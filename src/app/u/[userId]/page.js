'use client';
/**
 * Page component for /u/[userId].
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { SkeletonProfile } from '../../../components/loaders/SkeletonLoader';
import { ErrorEmptyState } from '../../../components/alerts/Alerts';
import { FaUser, FaEye, FaShareAlt, FaCheck, FaBan } from 'react-icons/fa';
import Link from 'next/link';
import BoostBadge from '../../../components/BoostBadge';
import { useToast } from '../../../components/ui/ToastProvider';

/** PublicProfilePage — main page component. */
const PublicProfilePage = ({ params }) => {
  const { userId } = params;
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [boostBadge, setBoostBadge] = useState(null);
  const [viewCount, setViewCount] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const isOwnProfile = currentUser && currentUser.uid === userId;
  const accentColor = doc?.accentColor || null;

  useEffect(() => {
    /** Fetches/retrieves data — fetchProfile. */
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use public API to fetch profile (works for all users, no auth needed)
        const profileRes = await fetch(`/api/users/public?uid=${userId}`);
        if (!profileRes.ok) {
          setError("Could not load profile. The user may not exist.");
          setLoading(false);
          return;
        }
        const profileData = await profileRes.json();
        setDoc(profileData.user);
        setPosts(profileData.posts || []);

        // Increment view count and get the count
        try {
          const viewRes = await fetch(`/api/users/${userId}/views`, { method: 'POST' });
          if (viewRes.ok) {
            const viewData = await viewRes.json();
            setViewCount(viewData.views ?? null);
          }
        } catch {}

        // Fetch boost badge from API
        try {
          const boostRes = await fetch(`/api/creator-boosts/active/public?uid=${userId}`);
          if (boostRes.ok) {
            const boostData = await boostRes.json();
            if (boostData.active) setBoostBadge(boostData.boost);
          }
        } catch {}
      } catch (err) {
        console.error("Error loading public profile:", err);
        setError("Could not load profile. The user may not exist.");
      }
      setLoading(false);
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);
  
  const dynamicStyles = accentColor ? {
    '--accent-color': accentColor,
  } : {};

  /** Handles share profile action. */
  const handleShareProfile = async () => {
    const url = `${window.location.origin}/u/${userId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const badge = boostBadge || doc?.activeBoost;

  return (
    <div style={dynamicStyles} className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <SkeletonProfile />
        ) : error ? (
          <ErrorEmptyState title="Profile Not Found" message={error} />
        ) : (
          <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-xl p-8 border-t-4 border-purple-200 dark:border-gray-600" style={{ borderTopColor: 'var(--accent-color)' }}>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <img 
                  src={doc?.photoURL || '/logo.png'} 
                  alt={doc?.displayName || 'User'} 
                  className="w-32 h-32 rounded-full ring-4 ring-purple-500 shadow-2xl"
                  style={{ ringColor: 'var(--accent-color)'}}
                  onError={(e)=>{ e.target.src='/logo.png'; }}
                />
              </div>
              <div className="mt-6 w-full">
                <div className="space-y-4">
                  <div className='flex justify-center items-center gap-2'>
                    <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600" style={{ color: 'var(--accent-color)' }}>{doc?.displayName || 'Anonymous'}</h2>
                    {badge && <BoostBadge badge={badge.badge} label={badge.badgeLabel} />}
                  </div>

                  {/* Points */}
                  <div className="flex justify-center items-center gap-6 mt-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{doc?.points?.lifetime ?? doc?.points ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Lifetime Points</p>
                    </div>
                    <div className="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{doc?.points?.weekly ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Weekly Points</p>
                    </div>
                  </div>

                  {/* View count & share */}
                  <div className="flex justify-center items-center gap-4 mt-2">
                    {viewCount !== null && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <FaEye className="text-purple-500" /> {viewCount} view{viewCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <button
                      onClick={handleShareProfile}
                      className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                    >
                      {copied ? <><FaCheck /> Copied!</> : <><FaShareAlt /> Share Profile</>}
                    </button>
                  </div>

                  {currentUser && !isOwnProfile && (
                    <button
                      onClick={async () => {
                        if (blockLoading) return;
                        setBlockLoading(true);
                        try {
                          const token = await currentUser.getIdToken();
                          if (isBlocked) {
                            await fetch(`/api/users/block?targetUid=${userId}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setIsBlocked(false);
                            toast('success', 'User unblocked');
                          } else {
                            await fetch('/api/users/block', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ targetUid: userId }),
                            });
                            setIsBlocked(true);
                            toast('success', 'User blocked');
                          }
                        } catch {
                          toast('error', 'Failed to update block status');
                        } finally {
                          setBlockLoading(false);
                        }
                      }}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        isBlocked ? 'text-red-500 hover:text-red-700' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <FaBan /> {isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                  )}

                  <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto pt-2 leading-relaxed">{doc?.bio || 'No bio yet.'}</p>
                  {Array.isArray(doc?.skills) && doc.skills.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 pt-4">
                      {doc.skills.map((skill) => (
                        <span key={skill} className="px-4 py-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-blue-300 rounded-full text-sm font-medium">{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr className="my-8 border-gray-200 dark:border-gray-600" />

            <div>
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-6" style={{ color: 'var(--accent-color)' }}>Showcase</h3>
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {posts.map(post => (
                    <Link key={post.id} href={post.link || '/showcase'} target={post.link ? '_blank' : '_self'} className="block bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-200 dark:border-gray-600 overflow-hidden" style={{ borderLeftColor: 'var(--accent-color)'}}>
                      {(post.mediaUrl || post.imageUrl) && (
                        <img src={post.mediaUrl || post.imageUrl} alt={post.title} className="w-full h-40 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                      <div className="p-4">
                        <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400" style={{ color: 'var(--accent-color)'}}>{post.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{post.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <ErrorEmptyState
                  icon={FaUser}
                  title="No Showcase Posts"
                  message="This user hasn't showcased any projects yet."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
