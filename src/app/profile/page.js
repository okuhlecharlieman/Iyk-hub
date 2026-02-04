'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProfileCard from '../../components/ProfileCard';
import PointsDisplay from '../../components/PointsDisplay';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const u = await getUserDoc(user.uid);
    setDoc(u);
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
                </div>
                <PointsDisplay points={doc?.points} />
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-8">
                <ProfileCard doc={doc} onUpdate={load} />
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">My Creations</h3>
                  <p className="text-gray-500 dark:text-gray-400">This section will display your showcased projects and contributions.</p>
                  {/* TODO: Fetch and display user's creations */}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
