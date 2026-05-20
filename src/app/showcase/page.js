'use client';

import { useEffect, useState } from 'react';
import PostCard, { PostCardSkeleton } from '../../components/showcase/PostCard';
import NewPostModal from '../../components/showcase/NewPostModal';
import { useAuth } from '../../context/AuthContext';

const ShowcasePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadPosts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/showcase?limit=50');
        if (!response.ok) {
          throw new Error('Unable to load the showcase.');
        }

        const data = await response.json();
        if (!mounted) return;

        setPosts(data.posts || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Unable to load the showcase. Please try again later.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPosts();
    return () => {
      mounted = false;
    };
  }, []);

  // reload when a new post is created
  useEffect(() => {
    let mounted = true;
    if (refreshKey === 0) return; // initial load handled above
    const reload = async () => {
      try {
        const response = await fetch('/api/showcase?limit=50');
        const data = await response.json();
        if (!mounted) return;
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Failed to reload showcase', err);
      }
    };
    reload();
    return () => { mounted = false; };
  }, [refreshKey]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">Showcase</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
          Discover creative work from the community and celebrate the best student projects, art, music, and code.
        </p>
      </div>

      <div className="relative">
        <button onClick={() => setIsModalOpen(true)} aria-label="New post" className="absolute right-0 -top-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg focus:outline-none">+
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <PostCard key={post.id} post={post} isOwner={user && user.uid === post.uid} />
          ))}
        </div>
      )}
      </div>

      <NewPostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPostCreated={() => { setIsModalOpen(false); setRefreshKey(k => k + 1); }} />
    </div>
  );
};

export default ShowcasePage;
