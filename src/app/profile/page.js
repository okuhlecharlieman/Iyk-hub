'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, updateUserDoc } from '../../lib/firebaseHelpers';

export default function ProfilePage() {
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState({ displayName: '', bio: '', skills: '' });
  const [saved, setSaved] = useState(false);

  useEffect(()=>{
    async function load() {
      if (!user) return;
      const u = await getUserDoc(user.uid);
      setDoc(u);
      setForm({
        displayName: u?.displayName || '',
        bio: u?.bio || '',
        skills: (u?.skills || []).join(', '),
      });
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
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
            Profile
          </h2>
          <form onSubmit={save} className="space-y-3">
            <input className="w-full border p-2 rounded" value={form.displayName} onChange={(e)=>setForm({...form, displayName:e.target.value})} placeholder="Display name" />
            <textarea className="w-full border p-2 rounded" rows={3} value={form.bio} onChange={(e)=>setForm({...form, bio:e.target.value})} placeholder="Bio" />
            <input className="w-full border p-2 rounded" value={form.skills} onChange={(e)=>setForm({...form, skills:e.target.value})} placeholder="Skills (comma separated)" />
            <button className="bg-neutral-900 text-white rounded px-4 py-2">Save</button>
            {saved ? <span className="ml-3 text-green-600">Saved</span> : null}
          </form>
          <div className="mt-4 text-sm text-neutral-600">Points: {doc?.points || 0}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}