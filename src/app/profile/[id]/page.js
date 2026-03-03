'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import ContentCard from '../../../components/ContentCard';
import { FaPaintBrush, FaUserCircle } from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

// This page now fetches all data using client-side calls that respect security rules.
// It gets the public user profile and then fetches and filters all showcase posts.
export default function ProfilePage() {
  const { id } = useParams(); // Get the user ID from the URL
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // 1. Fetch the user's public profile document from the 'users' collection.
        // This is a direct, client-side call that respects your Firestore security rules.
        const userDocRef = doc(db, 'users', id);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUser({ id: userDocSnap.id, ...userDocSnap.data() });
        } else {
          throw new Error('User not found');
        }

        // 2. Fetch all public posts from the secure API endpoint.
        const res = await fetch('/api/showcase');
        if (!res.ok) {
            throw new Error(`API call failed: ${res.statusText}`);
        }
        const allPosts = await res.json();

        // 3. Filter the posts on the client to show only this user's posts.
        const userPosts = allPosts.filter(p => p.uid === id);
        setPosts(userPosts);

      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("There was an error loading this profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
        <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Retry</button>
        </div>
    );
  }

  if (!user) {
    return <div className="text-center py-20">User not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-12 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
                {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover shadow-md" />
                ) : (
                    <FaUserCircle className="w-full h-full text-gray-400" />
                )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{user.displayName || 'Anonymous User'}</h1>
            {user.email && <p className="text-gray-600 dark:text-gray-400 mt-2">{user.email}</p>}
            <div className="mt-6">
                <p className="text-lg font-semibold text-yellow-500">Lifetime Points: {user.points?.lifetime || 0}</p>
            </div>
            {user.bio && <p className="mt-6 text-gray-700 dark:text-gray-300 max-w-prose mx-auto">{user.bio}</p>}
        </div>

        {/* User's Posts */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8">Creations by {user.displayName || 'User'}</h2>
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map(p => <ContentCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-md">
                <FaPaintBrush className="text-5xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">This user hasn't posted any creations yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
