'use client';
/**
 * Page component for /profile/[id].
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { SkeletonProfile } from '../../../components/loaders/SkeletonLoader';
import { ErrorEmptyState } from '../../../components/alerts/Alerts';
import { ErrorBoundary } from '../../../components/error/ErrorBoundary';
import { FaUser, FaEye, FaShareAlt, FaCheck, FaBan, FaExternalLinkAlt } from 'react-icons/fa';
import Link from 'next/link';
import BoostBadge from '../../../components/BoostBadge';
import { useToast } from '../../../components/ui/ToastProvider';

/** ProfileByIdPage — main page component. */
export default function ProfileByIdPage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [boostBadge, setBoostBadge] = useState(null);
  const [viewCount, setViewCount] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const isOwnProfile = currentUser && currentUser.uid === id;
  const accentColor = profile?.accentColor || null;

  const dynamicStyles = accentColor ? {
    '--accent-color': accentColor,
  } : {};

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profileRes = await fetch(`/api/users/public?uid=${id}`);
      if (!profileRes.ok) {
        setError('Could not load profile. The user may not exist.');
        setLoading(false);
        return;
      }
      const profileData = await profileRes.json();
      setProfile(profileData.user);
      setPosts(profileData.posts || []);

      // Increment view count
      try {
        const viewRes = await fetch(`/api/users/${id}/views`, { method: 'POST' });
        if (viewRes.ok) {
          const viewData = await viewRes.json();
          setViewCount(viewData.views ?? null);
        }
      } catch {}

      // Fetch boost badge
      try {
        const boostRes = await fetch(`/api/creator-boosts/active/public?uid=${id}`);
        if (boostRes.ok) {
          const boostData = await boostRes.json();
          if (boostData.active) setBoostBadge(boostData.boost);
        }
      } catch {}
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Could not load profile. The user may not exist.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchProfileData();
  }, [id, fetchProfileData]);

  /** Handles share profile action. */
  const handleShareProfile = async () => {
    const url = `${window.location.origin}/u/${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const inp = document.createElement('input');
      inp.value = url;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badge = boostBadge || profile?.activeBoost;

  return (
    <ErrorBoundary>
      <div style={dynamicStyles} className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <SkeletonProfile />
          ) : error ? (
            <ErrorEmptyState title="Profile Not Found" message={error} />
          ) : (
            <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-xl p-8 border-t-4 border-blue-100 dark:border-gray-600" style={{ borderTopColor: accentColor || undefined }}>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <img
                    src={profile?.photoURL || '/logo.png'}
                    alt={profile?.displayName || 'User'}
                    className="w-32 h-32 rounded-full ring-4 ring-purple-500 shadow-2xl"
                    style={{ ringColor: accentColor || undefined }}
                    onError={(e) => { e.target.src = '/logo.png'; }}
                  />
                </div>

                <div className="mt-6 w-full">
                  <div className="space-y-4">
                    <div className="flex justify-center items-center gap-2">
                      <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600" style={{ color: accentColor || undefined }}>{profile?.displayName || 'Anonymous'}</h2>
                      {badge && <BoostBadge badge={badge.badge} label={badge.badgeLabel} />}
                    </div>

                    {/* Points */}
                    <div className="flex justify-center items-center gap-6 mt-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{profile?.points?.lifetime ?? profile?.points ?? 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Lifetime Points</p>
                      </div>
                      <div className="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile?.points?.weekly ?? 0}</p>
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
                      {isOwnProfile && (
                        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline">
                          <FaExternalLinkAlt /> Edit Profile
                        </Link>
                      )}
                    </div>

                    {/* Block button for other users */}
                    {currentUser && !isOwnProfile && (
                      <button
                        onClick={async () => {
                          if (blockLoading) return;
                          setBlockLoading(true);
                          try {
                            const token = await currentUser.getIdToken();
                            if (isBlocked) {
                              await fetch(`/api/users/block?targetUid=${id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              setIsBlocked(false);
                              toast('success', 'User unblocked');
                            } else {
                              await fetch('/api/users/block', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ targetUid: id }),
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
                        className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                          isBlocked
                            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        <FaBan /> {isBlocked ? 'Unblock User' : 'Block User'}
                      </button>
                    )}

                    <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto pt-2 leading-relaxed">{profile?.bio || 'No bio yet.'}</p>
                    {(Array.isArray(profile?.skills) && profile.skills.length > 0) && (
                      <div className="flex flex-wrap justify-center gap-2 pt-4">
                        {profile.skills.map((skill) => (
                          <span key={skill} className="px-4 py-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-blue-300 rounded-full text-sm font-medium">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <hr className="my-8 border-gray-200 dark:border-gray-600" />

              {/* Showcase */}
              <div className="mt-8">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-6" style={{ color: accentColor || undefined }}>Showcase</h3>
                {posts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {posts.map(post => (
                      <Link key={post.id} href={post.link || '/showcase'} target={post.link ? '_blank' : '_self'} className="block bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-200 dark:border-gray-600 overflow-hidden" style={{ borderLeftColor: accentColor || undefined }}>
                        {(post.mediaUrl || post.imageUrl) && (
                          <img src={post.mediaUrl || post.imageUrl} alt={post.title} className="w-full h-40 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        )}
                        <div className="p-4">
                          <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400" style={{ color: accentColor || undefined }}>{post.title}</h4>
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
    </ErrorBoundary>
  );
}
