'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc } from '../../lib/firebase/user';
import { listUserShowcasePosts, updateUserDoc } from '../../lib/firebase/helpers';
import ProtectedRoute from '../../components/ProtectedRoute';
import { SkeletonProfile, SkeletonGrid } from '../../components/loaders/SkeletonLoader';
import { ErrorAlert, ErrorEmptyState, SuccessAlert } from '../../components/alerts/Alerts';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { FaEdit, FaSave, FaTimes, FaShieldAlt, FaUser } from 'react-icons/fa';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';


export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
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
        skills: (Array.isArray(userDoc?.skills) ? userDoc.skills : (typeof userDoc?.skills === 'string' ? userDoc.skills.split(',') : [])).map((skill) => String(skill).trim()).filter(Boolean).join(', '),
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
      toast('error', 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <SkeletonProfile />
            ) : error ? (
              <ErrorEmptyState 
                title="Profile Error" 
                message={error}
                onRetry={loadProfile}
              />
            ) : (
            <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-xl p-8 border border-blue-100 dark:border-gray-600">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  <img 
                    src={doc?.photoURL || user?.photoURL || '/logo.png'} 
                    alt={doc?.displayName || user?.email?.split('@')[0] || 'User'} 
                    className="w-32 h-32 rounded-full ring-4 ring-gradient-to-r from-blue-500 to-purple-600 shadow-2xl hover:shadow-none transition-all duration-300"
                    onError={(e)=>{ e.target.src='/logo.png'; }}
                  />
                </div>
                
                <div className="mt-6 w-full">
                  {isEditing ? (
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-600/20 p-6 rounded-xl">
                      <input type="text" name="displayName" value={form.displayName} onChange={handleFormChange} className="w-full px-4 py-2 text-2xl font-bold text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your Name" />
                      <textarea name="bio" value={form.bio} onChange={handleFormChange} className="w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your Bio" rows="3"></textarea>
                      <input type="text" name="skills" value={form.skills} onChange={handleFormChange} className="w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Skills (comma-separated)" />
                      <div className="flex justify-center gap-4 mt-6">
                        <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2">
                          {isSaving ? '...' : <><FaSave className="" /> Save</>}
                        </Button>
                        <Button variant="secondary" size="md" onClick={() => setIsEditing(false)} className="flex items-center justify-center gap-2"><FaTimes className="" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className='flex justify-center items-center gap-4'>
                        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{doc?.displayName || 'Anonymous'}</h2>
                        <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><FaEdit /></button>
                       </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user?.email}</p>
                      {doc?.role === 'admin' && (
                          <Link href="/admin" className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all">
                            <FaShieldAlt className="text-sm" />
                            Admin Dashboard
                          </Link>
                      )}
                      <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto pt-2 leading-relaxed">{doc?.bio || 'No bio yet.'}</p>
                      {(Array.isArray(doc?.skills) ? doc.skills : []).length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 pt-4">
                          {(Array.isArray(doc?.skills) ? doc.skills : []).map((skill) => (
                            <span key={skill} className="px-4 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <hr className="my-8 border-gray-200 dark:border-gray-600" />

              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">My Showcase</h3>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {posts.map(post => (
                            <div key={post.id} className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-blue-100 dark:border-gray-600">
                                <h4 className="font-bold text-lg text-blue-600 dark:text-blue-400">{post.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{post.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                  <ErrorEmptyState
                    icon={FaUser}
                    title="No Showcase Posts"
                    message="You haven't showcased any projects yet."
                    actionLabel="Go to Showcase"
                    actionUrl="/showcase"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
    </ProtectedRoute>
  );
}
