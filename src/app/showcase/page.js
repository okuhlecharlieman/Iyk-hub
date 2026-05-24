'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PostCard, { PostCardSkeleton } from '../../components/showcase/PostCard';
import NewPostModal from '../../components/showcase/NewPostModal';
import EditPostModal from '../../components/showcase/EditPostModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';
import { FaPalette, FaBolt, FaCrown } from 'react-icons/fa';

const ShowcasePage = () => {
  const { user, userProfile } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const isAdmin = useMemo(() => userProfile?.role?.toLowerCase() === 'admin', [userProfile]);

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

  const handleEdit = (post) => {
    setEditingPost(post);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/showcase/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast('success', 'Post deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      toast('error', err.message || 'Failed to delete post.');
    }
  };

  const handleEditSave = async (postId, updates) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/showcase/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId, updates }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      // Optimistically update the post in state
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
      setEditingPost(null);
      toast('success', 'Post updated successfully.');
      // Background refresh to sync with server
      setTimeout(() => fetchPosts(), 1500);
    } catch (err) {
      console.error('Update error:', err);
      toast('error', err.message || 'Failed to update post.');
    }
  };

  const featuredPosts = useMemo(() => posts.filter(p => p.isBoosted), [posts]);
  const regularPosts = useMemo(() => posts.filter(p => !p.isBoosted), [posts]);
  const pinnedPosts = useMemo(() => featuredPosts.filter(p => p.boostBadge?.plan === 'ultra'), [featuredPosts]);
  const otherFeatured = useMemo(() => featuredPosts.filter(p => p.boostBadge?.plan !== 'ultra'), [featuredPosts]);

  const renderPostCard = (post) => (
    <PostCard
      key={post.id}
      post={post}
      isOwner={user && user.uid === post.uid}
      isAdmin={isAdmin}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:py-8 md:px-8">
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
        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="New post"
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full w-14 h-14 shadow-xl hover:shadow-2xl focus:outline-none z-50 flex items-center justify-center text-2xl font-bold transition-all duration-300 hover:scale-110"
        >
          +
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
                        {renderPostCard(post)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other featured posts */}
              {otherFeatured.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {otherFeatured.map(post => renderPostCard(post))}
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
                {regularPosts.map(post => renderPostCard(post))}
              </div>
            </>
          )}
        </>
      )}
      </div>

      <NewPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPostCreated={(newPost) => {
        setIsModalOpen(false);
        if (newPost) {
          setPosts(prev => [newPost, ...prev]);
        }
        setTimeout(() => fetchPosts(), 2000);
      }} />

      {editingPost && (
        <EditPostModal
          isOpen={!!editingPost}
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleEditSave}
        />
      )}
      </div>
    </div>
  );
};

export default ShowcasePage;
