'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listUserShowcasePosts } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProfileCard from '../../components/ProfileCard';
import PointsDisplay from '../../components/PointsDisplay';
import ContentCard from '../../components/ContentCard';
import Link from 'next/link';
import { FaShieldAlt } from 'react-icons/fa';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [posts, setPosts] = useState([]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const u = await getUserDoc(user.uid);
    setDoc(u);
    const p = await listUserShowcasePosts(user.uid);
    setPosts(p);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          {loading || !user ? <LoadingSpinner /> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-1 space-y-8">
                <div className="flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                  <img 
                    src={user?.photoURL || '/logo.png'} 
                    alt={doc?.displayName || 'User'} 
                    className="w-32 h-32 rounded-full ring-4 ring-blue-500 shadow-lg mb-4"
                  />
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{doc?.displayName || 'Anonymous User'}</h2>
                  <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                  {doc?.role === 'admin' && (
                    <Link href="/admin" className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      <FaShieldAlt />
                      Admin Dashboard
                    </Link>
                  )}
                </div>
                <PointsDisplay points={doc?.points} />
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-8">
                <ProfileCard doc={doc} onUpdate={load} />
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">My Creations</h3>
                  {posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {posts.map(p => <ContentCard key={p.id} p={p} react={() => {}} />)}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">You haven't shared any creations yet. Why not add one to the showcase?</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
