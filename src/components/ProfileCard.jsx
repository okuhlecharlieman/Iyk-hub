import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateUserDoc } from '../../lib/firebaseHelpers';
import { FaSave, FaCheckCircle } from 'react-icons/fa';

export default function ProfileCard({ doc, onUpdate }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    displayName: doc?.displayName || user?.displayName || '',
    bio: doc?.bio || '',
    skills: (doc?.skills || []).join(', '),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function save(e) {
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
    if(onUpdate) onUpdate();
    setTimeout(() => setIsSaved(false), 2000);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
      <form onSubmit={save} className="space-y-6">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
          <input 
            id="displayName"
            type="text"
            className="mt-1 w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" 
            value={form.displayName} 
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} 
            placeholder="Your awesome name" 
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Bio</label>
          <textarea 
            id="bio"
            rows={4} 
            className="mt-1 w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" 
            value={form.bio} 
            onChange={(e) => setForm({ ...form, bio: e.target.value })} 
            placeholder="A little bit about yourself..." 
          />
        </div>
        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Skills</label>
          <input 
            id="skills"
            type="text"
            className="mt-1 w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" 
            value={form.skills} 
            onChange={(e) => setForm({ ...form, skills: e.target.value })} 
            placeholder="e.g., React, Firebase, UI/UX Design" 
          />
        </div>
        <div className="flex items-center justify-end">
          <button 
            type="submit"
            disabled={isSaving || isSaved}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold rounded-lg py-3 px-6 transition-all duration-300 ease-in-out flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : isSaved ? <><FaCheckCircle /> Saved!</> : <><FaSave /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
