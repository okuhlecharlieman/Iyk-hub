'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, getDailyViews } from '../../lib/firebase/user';
import { listUserShowcasePosts, updateUserDoc, uploadToStorage } from '../../lib/firebase/helpers';
import ProtectedRoute from '../../components/ProtectedRoute';
import { SkeletonProfile } from '../../components/loaders/SkeletonLoader';
import { ErrorEmptyState } from '../../components/alerts/Alerts';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { updateProfile } from 'firebase/auth';
import { FaEdit, FaSave, FaTimes, FaShieldAlt, FaUser, FaCamera, FaPalette, FaEye, FaExternalLinkAlt, FaShareAlt, FaCheck } from 'react-icons/fa';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { useActiveBoost } from '../../hooks/useActiveBoost';
import BoostBadge from '../../components/BoostBadge';
import ProfileAnalytics from '../../components/profile/ProfileAnalytics';
import { ActivePlanCard, BoostHistoryList } from '../../components/profile/ProfileBoostSection';
import AccountManagement from '../../components/profile/AccountManagement';

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
      const [userDoc, userPosts] = await Promise.all([
        getUserDoc(user.uid),
        listUserShowcasePosts(user.uid),
      ]);
      setDoc(userDoc);
      setPosts(userPosts);

      try {
        const dailyViews = await getDailyViews(user.uid);
        setAnalytics(dailyViews);
      } catch { setAnalytics([]); }

      setForm({
        displayName: userDoc?.displayName || user?.displayName || '',
        bio: userDoc?.bio || '',
        skills: (Array.isArray(userDoc?.skills) ? userDoc.skills.join(', ') : ''),
        accentColor: userDoc?.accentColor || '#6366F1',
      });
      setProfilePicturePreview(userDoc?.photoURL || user?.photoURL || null);

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

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setProfilePicturePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const updateData = { ...form, skills: skillsArray };
      if (activeBoost?.tier !== 'ULTRA') delete updateData.accentColor;

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
    } catch (err) {
      console.error("Error saving profile:", err);
      toast('error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/u/${user.uid}`;
    try { await navigator.clipboard.writeText(url); } catch {
      const inp = document.createElement('input'); inp.value = url;
      document.body.appendChild(inp); inp.select(); document.execCommand('copy'); document.body.removeChild(inp);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  
  const dynamicStyles = accentColor ? { '--accent-color': accentColor, '--accent-color--hover': `${accentColor}E6` } : {};

  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <div style={dynamicStyles} className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <SkeletonProfile />
            ) : error ? (
              <ErrorEmptyState title="Profile Error" message={error} onRetry={loadProfile} />
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
                       <div className='flex justify-center items-center gap-2'>
                        <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600" style={{ color: 'var(--accent-color)' }}>{doc?.displayName || 'Anonymous'}</h2>
                        {activeBoost && <BoostBadge badge={activeBoost.badge} label={activeBoost.badgeLabel} />}
                        <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><FaEdit /></button>
                       </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user?.email}</p>

                      <div className="flex justify-center items-center gap-6 mt-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{doc?.points?.lifetime ?? doc?.points ?? 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Lifetime Points</p>
                        </div>
                        <div className="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{doc?.points?.weekly ?? 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Weekly Points</p>
                        </div>
                      </div>

                      {activeBoost && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                          <FaEye />
                          <span>{doc?.profileViewCount || 0} profile views</span>
                        </div>
                      )}
                      <div className="flex justify-center items-center gap-3 mt-3">
                        <Link href={`/u/${user.uid}`} className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline">
                          <FaExternalLinkAlt /> View Public Profile
                        </Link>
                        <button onClick={handleCopyLink} className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline">
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

              {activeBoost && <ProfileAnalytics analytics={analytics} accentColor={accentColor} />}
              <ActivePlanCard activeBoost={activeBoost} />
              <BoostHistoryList boostHistory={boostHistory} />

              <div className="mt-8">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-6" style={{ color: 'var(--accent-color)' }}>My Showcase</h3>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {posts.map(post => (
                            <Link key={post.id} href={post.link || '/showcase'} target={post.link ? '_blank' : '_self'} className="block bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-200 dark:border-gray-600 overflow-hidden" style={{ borderLeftColor: 'var(--accent-color)'}}>
                                {(post.mediaUrl || post.imageUrl) && (
                                  <img src={post.mediaUrl || post.imageUrl} alt={post.title} className="w-full h-40 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                )}
                                <div className="p-4">
                                  <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400" style={{ color: 'var(--accent-color)'}}>{post.title}</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{post.description}</p>
                                </div>
                            </Link>
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

              <AccountManagement user={user} doc={doc} toast={toast} />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
    </ProtectedRoute>
  );
}
