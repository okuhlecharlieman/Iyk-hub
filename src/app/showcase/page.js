'use client';
import { useEffect, useState } from 'react';
import ContentCard from '../../components/ContentCard';
import { reactToPost } from '../../lib/firebase/helpers'; 
import { useAuth } from '../../lib/firebase/user'; 
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ShowcasePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Fetch posts from the new, centralized API endpoint
      const response = await fetch('/api/showcase');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
      setError('Could not load the showcase. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleReaction = async (postId, reaction) => {
    if (!user) {
      alert('You must be logged in to react.');
      return;
    }
    try {
      await reactToPost(postId, user.uid, reaction);
      // Re-fetch posts to show the updated reaction count
      fetchPosts(); 
    } catch (err) {
      console.error(err);
      alert('Failed to add reaction. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Community Showcase</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Creations from our talented community members.</p>
        </div>

        {loading ? <LoadingSpinner /> :
          error ? <div className="text-red-500 text-center py-10">{error}</div> :
          posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(p => (
                <ContentCard key={p.id} p={p} react={handleReaction} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">The showcase is empty. Be the first to post!</p>
            </div>
          )
        }
      </div>
    </div>
  );
}
