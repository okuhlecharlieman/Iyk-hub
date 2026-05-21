'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, getDailyViews } from '../../lib/firebase/user';
import { listUserShowcasePosts, updateUserDoc, uploadToStorage } from '../../lib/firebase/helpers';
import ProtectedRoute from '../../components/ProtectedRoute';
import { SkeletonProfile, SkeletonGrid } from '../../components/loaders/SkeletonLoader';
import { ErrorEmptyState } from '../../components/alerts/Alerts';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { updateProfile } from 'firebase/auth';
import { FaEdit, FaSave, FaTimes, FaShieldAlt, FaUser, FaCamera, FaPalette, FaEye, FaExternalLinkAlt, FaChartLine, FaShareAlt, FaCheck, FaRocket, FaClock, FaHistory } from 'react-icons/fa';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { useActiveBoost } from '../../hooks/useActiveBoost';
import BoostBadge from '../../components/BoostBadge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { boost: activeBoost } = useActiveBoost();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', skills: '', accentColor: '#6366F1' });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [copied, setCopied] = useState(false);
  const [boostHistory, setBoostHistory] = useState([]);

  const accentColor = doc?.accentColor || null;

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [userDoc, userPosts, dailyViews] = await Promise.all([
        getUserDoc(user.uid),
        listUserShowcasePosts(user.uid),
        getDailyViews(user.uid),
      ]);
      setDoc(userDoc);
      setPosts(userPosts);
      setAnalytics(dailyViews);
      setForm({
        displayName: userDoc?.displayName || user?.displayName || '',
        bio: userDoc?.bio || '',
        skills: (Array.isArray(userDoc?.skills) ? userDoc.skills.join(', ') : ''),
        accentColor: userDoc?.accentColor || '#6366F1',
      });
      setProfilePicturePreview(userDoc?.photoURL || user?.photoURL || null);

      // Fetch boost history
      try {
        const token = await user.getIdToken();
        const histRes = await fetch('/api/creator-boosts/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          setBoostHistory(histData.orders || []);
        }
      } catch {}
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePicturePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const updateData = { ...form, skills: skillsArray };

      if (activeBoost?.tier !== 'ULTRA') {
        delete updateData.accentColor;
      }

      if (profilePictureFile) {
        const photoURL = await uploadToStorage(profilePictureFile, `profiles/${user.uid}`);
        updateData.photoURL = photoURL;
        await updateProfile(user, { photoURL });
      }

      await updateUserDoc(user.uid, updateData);
      setIsEditing(false);
      setProfilePictureFile(null);
      await loadProfile();
      toast('success', 'Profile updated successfully!');
    } catch (error) {
      console.error("Error saving profile:", error);
      toast('error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const dynamicStyles = accentColor ? {
    '--accent-color': accentColor,
    '--accent-color--hover': `${accentColor}E6`,
  } : {};

  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <div style={dynamicStyles} className="min-h-screen pt-24 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
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
            <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-xl p-8 border-t-4 border-blue-100 dark:border-gray-600" style={{ borderTopColor: 'var(--accent-color)'}}>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <img 
                    src={profilePicturePreview || '/logo.png'} 
                    alt={form.displayName || 'User'} 
                    className="w-32 h-32 rounded-full ring-4 ring-purple-500 shadow-2xl transition-all duration-300"
                    style={{ ringColor: 'var(--accent-color)'}}
                    onError={(e)=>{ e.target.src='/logo.png'; }}
                  />
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer transition-colors" style={{ backgroundColor: 'var(--accent-color)', '--tw-shadow-color': 'var(--accent-color)' }}>
                      <FaCamera className="text-sm" />
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
                
                <div className="mt-6 w-full">
                  {isEditing ? (
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-600/20 p-6 rounded-xl">
                      <input type="text" name="displayName" value={form.displayName} onChange={handleFormChange} className="w-full px-4 py-2 text-2xl font-bold text-center border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500" style={{ '--ring-color': 'var(--accent-color)'}} placeholder="Your Name" />
                      <textarea name="bio" value={form.bio} onChange={handleFormChange} className="w-full px-4 py-2 text-center border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500" style={{ '--ring-color': 'var(--accent-color)'}} placeholder="Your Bio" rows="3"></textarea>
                      <input type="text" name="skills" value={form.skills} onChange={handleFormChange} className="w-full px-4 py-2 text-center border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500" style={{ '--ring-color': 'var(--accent-color)'}} placeholder="Skills (comma-separated)" />
                      {activeBoost?.tier === 'ULTRA' && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <FaPalette className="text-gray-500" />
                          <label htmlFor="accentColor" className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</label>
                          <input type="color" id="accentColor" name="accentColor" value={form.accentColor} onChange={handleFormChange} className="w-10 h-10 rounded-lg border-gray-300 cursor-pointer"/>
                        </div>
                      )}
                      <div className="flex justify-center gap-4 mt-6">
                        <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} style={{ backgroundColor: 'var(--accent-color)' }}>
                          {isSaving ? 'Saving...' : <><FaSave /> Save</>}
                        </Button>
                        <Button variant="secondary" size="md" onClick={() => setIsEditing(false)}><FaTimes /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className='flex justify-center items-center gap-4'>
                        <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600" style={{ color: 'var(--accent-color)' }}>{doc?.displayName || 'Anonymous'}</h2>
                        <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><FaEdit /></button>
                       </div>
                      {activeBoost && (
                        <div className="mt-2">
                          <BoostBadge badge={activeBoost.badge} label={activeBoost.badgeLabel} />
                        </div>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user?.email}</p>
                      {(activeBoost?.tier === 'PRO' || activeBoost?.tier === 'ULTRA') && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                          <FaEye />
                          <span>{doc?.profileViewCount || 0} profile views</span>
                        </div>
                      )}
                      <div className="flex justify-center items-center gap-3 mt-3">
                        <Link href={`/u/${user.uid}`} className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline">
                          <FaExternalLinkAlt /> View Public Profile
                        </Link>
                        <button
                          onClick={async () => {
                            const url = `${window.location.origin}/u/${user.uid}`;
                            try { await navigator.clipboard.writeText(url); } catch {
                              const inp = document.createElement('input'); inp.value = url;
                              document.body.appendChild(inp); inp.select(); document.execCommand('copy'); document.body.removeChild(inp);
                            }
                            setCopied(true); setTimeout(() => setCopied(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
                        >
                          {copied ? <><FaCheck /> Copied!</> : <><FaShareAlt /> Share Link</>}
                        </button>
                      </div>
                      {doc?.role?.toLowerCase() === 'admin' && (
                          <Link href="/admin" className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all">
                            <FaShieldAlt className="text-sm" />
                            Admin Dashboard
                          </Link>
                      )}
                      <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto pt-2 leading-relaxed">{doc?.bio || 'No bio yet.'}</p>
                      {(Array.isArray(doc?.skills) && doc.skills.length > 0) && (
                        <div className="flex flex-wrap justify-center gap-2 pt-4">
                          {doc.skills.map((skill) => (
                            <span key={skill} className="px-4 py-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-blue-300 rounded-full text-sm font-medium">{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <hr className="my-8 border-gray-200 dark:border-gray-600" />

              {activeBoost?.tier === 'ULTRA' && (
                <div className="mt-8">
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-6" style={{ color: 'var(--accent-color)' }}><FaChartLine className="inline-block mr-2"/>Profile Analytics</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={analytics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke={accentColor || '#8884d8'} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Active Plan Status */}
              {activeBoost && (
                <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <FaRocket className="text-purple-500 text-lg" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Plan</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full font-semibold">{activeBoost.label || activeBoost.tier}</span>
                    {activeBoost.expiresAt && (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <FaClock className="text-xs" />
                        Expires: {new Date(activeBoost.expiresAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Link href="/creator-boosts" className="mt-3 inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">
                    Renew or Upgrade
                  </Link>
                </div>
              )}

              {/* Boost History */}
              {boostHistory.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FaHistory className="text-gray-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Boost History</h3>
                  </div>
                  <div className="space-y-2">
                    {boostHistory.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{order.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' :
                            order.status === 'expired' ? 'bg-gray-100 text-gray-500 dark:bg-gray-600/40 dark:text-gray-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/40 dark:text-yellow-300'
                          }`}>{order.status}</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-6" style={{ color: 'var(--accent-color)' }}>My Showcase</h3>
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
                    message="You haven't showcased any projects yet."
                    actionLabel="Go to Showcase"
                    actionUrl="/showcase"
                  />
                )}
              </div>

              {/* Account Management */}
              <hr className="my-8 border-gray-200 dark:border-gray-600" />
              <div className="mt-4">
                <button
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
                    if (!window.confirm('This will permanently delete your profile, posts, and all data. Proceed?')) return;
                    try {
                      const token = await user.getIdToken();
                      const res = await fetch('/api/account/delete', {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        window.location.href = '/';
                      } else {
                        toast('error', 'Failed to delete account');
                      }
                    } catch {
                      toast('error', 'Failed to delete account');
                    }
                  }}
                  className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Remove Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
    </ProtectedRoute>
  );
}
