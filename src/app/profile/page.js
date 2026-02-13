'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listUserShowcasePosts, updateUserDoc } from '../../lib/firebaseHelpers';
import ProtectedRoute from '../../components/ProtectedRoute';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FaEdit, FaSave, FaTimes, FaShieldAlt } from 'react-icons/fa';
import Link from 'next/link';


export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', skills: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [userDoc, userPosts] = await Promise.all([
        getUserDoc(user.uid),
        listUserShowcasePosts(user.uid),
      ]);
      setDoc(userDoc);
      setPosts(userPosts);
      setForm({
        displayName: userDoc?.displayName || user?.displayName || '',
        bio: userDoc?.bio || '',
        skills: (userDoc?.skills || []).join(', '),
      });
    } catch (err) {
      console.error("Error loading profile data:", err);
      setError("There was an error loading your profile. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      await updateUserDoc(user.uid, { ...form, skills: skillsArray });
      setIsEditing(false);
      await loadProfile(); // Refresh data
    } catch (error) {
      console.error("Error saving profile:", error);
      alert('Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="text-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">
              <p className="mb-3">{error}</p>
              <div className="flex justify-center">
                <button onClick={loadProfile} className="btn-primary">Retry</button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <img 
                    src={doc?.photoURL || user?.photoURL || '/logo.png'} 
                    alt={doc?.displayName || user?.email?.split('@')[0] || 'User'} 
                    className="w-32 h-32 rounded-full ring-4 ring-blue-500 dark:ring-blue-600 shadow-lg"
                    onError={(e)=>{ e.target.src='/logo.png'; }}
                  />
                </div>
                
                <div className="mt-6 w-full">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input type="text" name="displayName" value={form.displayName} onChange={handleFormChange} className="input-field text-2xl font-bold text-center" placeholder="Your Name" />
                      <textarea name="bio" value={form.bio} onChange={handleFormChange} className="input-field text-center" placeholder="Your Bio" rows="3"></textarea>
                      <input type="text" name="skills" value={form.skills} onChange={handleFormChange} className="input-field text-center" placeholder="Skills (comma-separated)" />
                      <div className="flex justify-center gap-4 mt-4">
                        <button onClick={handleSave} disabled={isSaving} className="btn-primary w-24 flex items-center justify-center">
                          {isSaving ? <LoadingSpinner size="sm" /> : <><FaSave className="mr-2" /> Save</>}
                        </button>
                        <button onClick={() => setIsEditing(false)} className="btn-secondary w-24 flex items-center justify-center"><FaTimes className="mr-2" /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       <div className='flex justify-center items-center gap-4'>
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{doc?.displayName || 'Anonymous'}</h2>
                        <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"><FaEdit /></button>
                       </div>
                      <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                      {doc?.role === 'admin' && (
                          <Link href="/admin" className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                            <FaShieldAlt />
                            <span>Admin Dashboard</span>
                          </Link>
                      )}
                      <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto pt-2">{doc?.bio || 'No bio yet.'}</p>
                      {doc?.skills?.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 pt-3">
                          {doc.skills.map(skill => <span key={skill} className="chip">{skill}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <hr className="my-8 border-gray-200 dark:border-gray-700" />

              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Showcase</h3>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {posts.map(post => (
                            <div key={post.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 shadow-sm">
                                <h4 className="font-bold text-lg text-blue-600 dark:text-blue-400">{post.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{post.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">You haven't showcased any projects yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
