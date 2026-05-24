'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ContentCard from '../../../components/ContentCard';
import ProfileEditor from '../../../components/ProfileEditor';
import { FaPaintBrush, FaUserCircle, FaPencilAlt, FaBan } from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useToast } from '../../../components/ui/ToastProvider';
import BoostBadge from '../../../components/BoostBadge';

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
  const [boostBadge, setBoostBadge] = useState(null);
  const toast = useToast();

  const isOwner = currentUser && currentUser.uid === id;
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      // Use public API to fetch profile (works for all users, no auth needed)
      const profileRes = await fetch(`/api/users/public?uid=${id}`);
      if (!profileRes.ok) throw new Error('User not found');
      const profileData = await profileRes.json();

      const userData = profileData.user;
      setProfile({ ...userData, skills: normalizeSkills(userData.skills) });
      setPosts(profileData.posts || []);

      try {
        const boostRes = await fetch(`/api/creator-boosts/active/public?uid=${id}`);
        if (boostRes.ok) {
          const boostData = await boostRes.json();
          if (boostData.active) setBoostBadge(boostData.boost);
        }
      } catch {
        // Badge is optional, fail silently
      }
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
      toast('error', err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!profile) return <div className="text-center py-20">User not found.</div>;

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
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
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                {profile.displayName || 'Anonymous'}
                {boostBadge && <BoostBadge badge={boostBadge.badge} label={boostBadge.badgeLabel} />}
              </h1>
              {profile.bio && <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-prose mx-auto">{profile.bio}</p>}

              {/* Points */}
              <div className="flex justify-center items-center gap-6 mt-4">
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
            {isOwner ? (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="flex-shrink-0 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-2 rounded-full"
                aria-label="Edit Profile"
              >
                <FaPencilAlt size={20} />
              </button>
            ) : currentUser && (
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
                className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                  isBlocked ? 'text-red-500 hover:text-red-700' : 'text-gray-400 hover:text-red-500'
                }`}
                aria-label={isBlocked ? 'Unblock User' : 'Block User'}
                title={isBlocked ? 'Unblock User' : 'Block User'}
              >
                <FaBan size={18} />
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
