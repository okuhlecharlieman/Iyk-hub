'use client';
import { useEffect, useState } from 'react';
import { getUserDoc, listUserShowcasePosts } from '../../../lib/firebase/helpers';
import { SkeletonProfile } from '../../../components/loaders/SkeletonLoader';
import { ErrorEmptyState } from '../../../components/alerts/Alerts';
import { FaUser } from 'react-icons/fa';
import BoostBadge from '../../../components/BoostBadge';

const PublicProfilePage = ({ params }) => {
  const { userId } = params;
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const accentColor = doc?.accentColor || null;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userDoc, userPosts] = await Promise.all([
          getUserDoc(userId),
          listUserShowcasePosts(userId),
        ]);
        setDoc(userDoc);
        setPosts(userPosts);
        // Call the API to increment the view count
        fetch(`/api/users/${userId}/views`, { method: 'POST' });
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

  return (
    <div style={dynamicStyles} className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
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
                  <div className='flex justify-center items-center gap-4'>
                    <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600" style={{ color: 'var(--accent-color)' }}>{doc?.displayName || 'Anonymous'}</h2>
                  </div>
                  {doc?.activeBoost && (
                    <div className="mt-2">
                      <BoostBadge badge={doc.activeBoost.badge} label={doc.activeBoost.badgeLabel} />
                    </div>
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
                    <div key={post.id} className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-200 dark:border-gray-600" style={{ borderLeftColor: 'var(--accent-color)'}}>
                      <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400" style={{ color: 'var(--accent-color)'}}>{post.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{post.description}</p>
                    </div>
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
