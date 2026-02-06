'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listUserShowcasePosts, updateUserDoc } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import PointsDisplay from '../../components/PointsDisplay';
import ContentCard from '../../components/ContentCard';
import Link from 'next/link';
import { FaShieldAlt, FaEdit, FaSave, FaCheckCircle, FaSpinner, FaPlusCircle } from 'react-icons/fa';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', skills: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [u, p] = await Promise.all([
        getUserDoc(user.uid),
        listUserShowcasePosts(user.uid),
      ]);
      setDoc(u);
      setPosts(p);
      setForm({
        displayName: u?.displayName || user?.displayName || '',
        bio: u?.bio || '',
        skills: (u?.skills || []).join(', '),
      });
    } catch (err) {
      console.error("Error loading profile data:", err);
      setError("There was an error loading your profile. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    await updateUserDoc(user.uid, {
      displayName: form.displayName,
      bio: form.bio,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
    });
    setIsSaving(false);
    setIsSaved(true);
    await load(); // Reload data to show updates
    setTimeout(() => {
      setIsSaved(false);
      setIsEditing(false);
    }, 2000);
  }

  const inputStyles = "mt-1 w-full text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition duration-200";
  const labelStyles = "block text-sm font-semibold text-gray-600 dark:text-gray-300";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8 md:py-16">
        <div className="max-w-5xl mx-auto">
          {loading ? <div className="flex justify-center"><LoadingSpinner /></div> : error ? (
            <div className="text-center text-red-500 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
              <p>{error}</p>
              <button onClick={load} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Retry
              </button>
            </div>
          ) : user && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Combined Profile Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <div className="flex flex-col items-center text-center">
                    <img 
                      src={user?.photoURL || '/logo.png'} 
                      alt={doc?.displayName || 'User'} 
                      className="w-32 h-32 rounded-full ring-4 ring-blue-500 shadow-lg mb-4"
                    />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{doc?.displayName || 'Anonymous'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
                    {doc?.role === 'admin' && (
                        <Link href="/admin" className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                        <FaShieldAlt />
                        Admin Area
                        </Link>
                    )}
                  </div>
                  <hr className="my-6 border-gray-200 dark:border-gray-700" />
                  {isEditing ? (
                    <form onSubmit={handleSave} className="space-y-4">
                      <div>
                        <label htmlFor="displayName" className={labelStyles}>Display Name</label>
                        <input id="displayName" type="text" className={inputStyles} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your Name" />
                      </div>
                      <div>
                        <label htmlFor="bio" className={labelStyles}>Bio</label>
                        <textarea id="bio" rows={3} className={inputStyles} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="About you..." />
                      </div>
                      <div>
                        <label htmlFor="skills" className={labelStyles}>Skills</label>
                        <input id="skills" type="text" className={inputStyles} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, JS, etc."/>
                      </div>
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:underline">Cancel</button>
                        <button type="submit" disabled={isSaving || isSaved} className={`font-bold rounded-lg py-2 px-4 transition-all duration-300 ease-in-out flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSaved ? 'bg-green-500 text-white focus:ring-green-400' : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-400'} disabled:opacity-60`}>
                          {isSaving ? <FaSpinner className="animate-spin"/> : isSaved ? <FaCheckCircle /> : <FaSave />} {isSaving ? 'Saving' : isSaved ? 'Saved!' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Bio</h4>
                            <p className="text-gray-800 dark:text-gray-200">{doc?.bio || <span className="text-gray-400 dark:text-gray-500">No bio set.</span>}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Skills</h4>
                            <p className="text-gray-800 dark:text-gray-200">{doc?.skills?.join(', ') || <span className="text-gray-400 dark:text-gray-500">No skills listed.</span>}</p>
                        </div>
                        <button onClick={() => setIsEditing(true)} className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors">
                            <FaEdit /> Edit Profile
                        </button>
                    </div>
                  )}
                </div>
                <PointsDisplay points={doc?.points} />
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">My Creations</h3>
                    <Link href="/showcase/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
                      <FaPlusCircle /> Create
                    </Link>
                  </div>
                  {posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {posts.map(p => <ContentCard key={p.id} p={p} noactions />)}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">You haven’t shared any creations yet.</p>
                      <Link href="/showcase/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg">
                        Share Your First Creation
                      </Link>
                    </div>
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
