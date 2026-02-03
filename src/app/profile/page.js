'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, updateUserDoc } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState({ displayName: '', bio: '', skills: '' });
  const [saved, setSaved] = useState(false);

  useEffect(()=>{
    async function load() {
      if (!user) {
        setLoading(true);
        return;
      };
      setLoading(true);
      const u = await getUserDoc(user.uid);
      setDoc(u);
      setForm({
        displayName: u?.displayName || user?.displayName || '',
        bio: u?.bio || '',
        skills: (u?.skills || []).join(', '),
      });
      setLoading(false);
    }
    load();
  },[user]);

  async function save(e) {
    e.preventDefault();
    if (!user) return;
    await updateUserDoc(user.uid, {
      displayName: form.displayName,
      bio: form.bio,
      skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean),
    });
    setSaved(true);
    setTimeout(()=>setSaved(false), 1500);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[70vh] flex flex-col items-center px-4 py-12 md:py-20 bg-gradient-to-br from-teal-50 via-yellow-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
            Profile
          </h2>
          {loading || !user ? <LoadingSpinner /> : (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column: Profile Picture and Points */}
              <div className="md:w-1/3 flex flex-col items-center space-y-4">
                <img src={user?.photoURL || '/logo.png'} alt={form.displayName} className="w-32 h-32 rounded-full shadow-md" />
                <div className="text-center">
                  <div className="text-lg font-semibold">Points</div>
                  <div className="text-3xl font-bold text-teal-500">{doc?.points?.lifetime || 0}</div>
                </div>
              </div>

              {/* Right Column: Profile Form */}
              <div className="md:w-2/3">
                <form onSubmit={save} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                    <input className="mt-1 w-full border p-2 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" value={form.displayName} onChange={(e)=>setForm({...form, displayName:e.target.value})} placeholder="Display name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                    <textarea className="mt-1 w-full border p-2 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" rows={3} value={form.bio} onChange={(e)=>setForm({...form, bio:e.target.value})} placeholder="Tell us about yourself" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Skills</label>
                    <input className="mt-1 w-full border p-2 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" value={form.skills} onChange={(e)=>setForm({...form, skills:e.target.value})} placeholder="Skills (comma separated)" />
                  </div>
                  <div className="flex items-center">
                    <button className="bg-neutral-900 text-white rounded-md px-4 py-2 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500">Save</button>
                    {saved ? <span className="ml-3 text-green-600">Saved!</span> : null}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
