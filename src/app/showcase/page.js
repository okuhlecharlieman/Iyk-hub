'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PostCard, { PostCardSkeleton } from '../../components/showcase/PostCard';
import NewPostModal from '../../components/showcase/NewPostModal';
import { useAuth } from '../../context/AuthContext';
import { FaPalette, FaBolt, FaCrown } from 'react-icons/fa';

const ShowcasePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/showcase?limit=50');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Showcase fetch error:', err);
      setError('Unable to load the showcase. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchPosts();
  }, [fetchPosts]);

  const featuredPosts = useMemo(() => posts.filter(p => p.isBoosted), [posts]);
  const regularPosts = useMemo(() => posts.filter(p => !p.isBoosted), [posts]);
  const pinnedPosts = useMemo(() => featuredPosts.filter(p => p.boostBadge?.plan === 'ultra'), [featuredPosts]);
  const otherFeatured = useMemo(() => featuredPosts.filter(p => p.boostBadge?.plan !== 'ultra'), [featuredPosts]);

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-3 text-white shadow-lg">
              <FaPalette className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">Community Showcase</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Creations from our talented community members.
          </p>
        </div>

      <div className="relative">
        <button onClick={() => setIsModalOpen(true)} aria-label="New post" className="absolute right-0 -top-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg focus:outline-none z-10">+
        </button>
        {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-900/40 p-6 text-red-700 dark:text-red-200">
          <p className="font-semibold">Unable to load the showcase.</p>
          <p>{error}</p>
        </div>
        ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => <PostCardSkeleton key={index} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 dark:border-blue-700/60 dark:bg-blue-950/30 p-10 text-center">
          <h2 className="text-2xl font-semibold mb-3">No showcase posts yet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Be the first to share your work with the community.</p>
          <a href="/login" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg hover:bg-blue-700 transition">
            Login to submit your first post
          </a>
        </div>
      ) : (
        <>
          {/* Featured / Pinned Section */}
          {featuredPosts.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
                  <FaBolt className="text-xs" />
                  Featured
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Boosted creators&apos; posts</p>
              </div>

              {/* Pinned Ultra posts */}
              {pinnedPosts.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pinnedPosts.map(post => (
                      <div key={post.id} className="relative">
                        <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FaCrown className="text-[10px]" /> Pinned
                        </div>
                        <PostCard post={post} isOwner={user && user.uid === post.uid} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other featured posts */}
              {otherFeatured.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {otherFeatured.map(post => (
                    <PostCard key={post.id} post={post} isOwner={user && user.uid === post.uid} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regular posts */}
          {regularPosts.length > 0 && (
            <>
              {featuredPosts.length > 0 && (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Posts</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map(post => (
                  <PostCard key={post.id} post={post} isOwner={user && user.uid === post.uid} />
                ))}
              </div>
            </>
          )}
        </>
      )}
      </div>

      <NewPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPostCreated={() => { setIsModalOpen(false); fetchPosts(); }} />
      </div>
    </div>
  );
};

export default ShowcasePage;
