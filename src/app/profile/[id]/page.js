'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import ContentCard from '../../../components/ContentCard';
import ProfileEditor from '../../../components/ProfileEditor';
import { FaPaintBrush, FaUserCircle, FaPencilAlt } from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.filter((skill) => typeof skill === 'string').map((skill) => skill.trim()).filter(Boolean);
  }

  if (typeof skills === 'string') {
    return skills.split(',').map((skill) => skill.trim()).filter(Boolean);
  }

  return [];
}

function extractPostsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.posts)) {
    return payload.posts;
  }

  return [];
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const isOwner = currentUser && currentUser.uid === id;

  const fetchProfileData = useCallback(async () => {
    try {
      const userDocRef = doc(db, 'users', id);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setProfile({ id: userDocSnap.id, ...data, skills: normalizeSkills(data.skills) });
      } else {
        throw new Error('User not found');
      }

      const res = await fetch('/api/showcase');
      if (!res.ok) throw new Error(`API call failed: ${res.statusText}`);
      const showcasePayload = await res.json();
      const allPosts = extractPostsPayload(showcasePayload);

      const userPosts = allPosts.filter((post) => post.uid === id);
      setPosts(userPosts);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('There was an error loading this profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchProfileData();
    }
  }, [id, fetchProfileData]);

  const handleSaveProfile = async (updates) => {
    if (!isOwner) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update profile.');
      }

      setIsEditorOpen(false);
      await fetchProfileData();
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!profile) return <div className="text-center py-20">User not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-12">
          <div className="flex justify-between items-start">
            <div className="text-center flex-grow">
              <div className="relative w-32 h-32 mx-auto mb-4">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full rounded-full object-cover shadow-md" />
                ) : (
                  <FaUserCircle className="w-full h-full text-gray-400" />
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{profile.displayName || 'Anonymous'}</h1>
              {profile.bio && <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-prose mx-auto">{profile.bio}</p>}

              {profile.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full dark:bg-blue-900 dark:text-blue-200">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="flex-shrink-0 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-2 rounded-full"
                aria-label="Edit Profile"
              >
                <FaPencilAlt size={20} />
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8">Creations</h2>
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map((post) => <ContentCard key={post.id} p={post} />)}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-md">
              <FaPaintBrush className="text-5xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No creations posted yet.</p>
            </div>
          )}
        </div>
      </div>

      {isEditorOpen && (
        <ProfileEditor
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}
