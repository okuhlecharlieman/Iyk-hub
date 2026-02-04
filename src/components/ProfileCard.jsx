import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserDoc } from '../lib/firebaseHelpers';
import { FaSave, FaCheckCircle, FaSpinner } from 'react-icons/fa';

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
    setTimeout(() => setIsSaved(false), 2500);
  }

  const inputStyles = "mt-1 w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200";
  const labelStyles = "block text-sm font-semibold text-gray-700 dark:text-gray-300";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
      <form onSubmit={save} className="space-y-6">
        <div>
          <label htmlFor="displayName" className={labelStyles}>Display Name</label>
          <input 
            id="displayName"
            type="text"
            className={inputStyles}
            value={form.displayName} 
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} 
            placeholder="Your awesome name" 
          />
        </div>
        <div>
          <label htmlFor="bio" className={labelStyles}>Your Bio</label>
          <textarea 
            id="bio"
            rows={4} 
            className={inputStyles}
            value={form.bio} 
            onChange={(e) => setForm({ ...form, bio: e.target.value })} 
            placeholder="A little bit about yourself..." 
          />
        </div>
        <div>
          <label htmlFor="skills" className={labelStyles}>Skills (comma-separated)</label>
          <input 
            id="skills"
            type="text"
            className={inputStyles} 
            value={form.skills} 
            onChange={(e) => setForm({ ...form, skills: e.target.value })} 
            placeholder="e.g., React, Firebase, UI/UX Design" 
          />
        </div>
        <div className="flex items-center justify-end pt-2">
          <button 
            type="submit"
            disabled={isSaving || isSaved}
            className={`font-bold rounded-lg py-3 px-6 transition-all duration-300 ease-in-out flex items-center gap-2 shadow-md focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isSaved ? 'bg-green-500 text-white focus:ring-green-300' : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? <><FaSpinner className="animate-spin" /> Saving...</> : isSaved ? <><FaCheckCircle /> Saved!</> : <><FaSave /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
