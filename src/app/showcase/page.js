'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { createShowcasePost, listShowcasePosts, reactToPost, uploadToStorage, awardUploadPoints } from '../../lib/firebaseHelpers';
import ContentCard from '../../components/ContentCard';
import { FaPlus } from 'react-icons/fa';

export default function ShowcasePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ type: 'art', title: '', description: '', code: '', language: 'javascript', file: null });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(true);

  async function load() {
    const list = await listShowcasePosts(50);
    setPosts(list);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErr('');
    try {
      let mediaUrl = null;
      if (form.file) {
        mediaUrl = await uploadToStorage(form.file, 'showcase');
      }
      await createShowcasePost(
        {
          type: form.type,
          title: form.title,
          description: form.description,
          mediaUrl,
          code: form.type === 'code' ? form.code : null,
          language: form.type === 'code' ? form.language : null,
        },
        user.uid
      );
      await awardUploadPoints(user.uid);
      setForm({ type: 'art', title: '', description: '', code: '', language: 'javascript', file: null });
      setIsFormVisible(false);
      await load();
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function react(id, emoji) {
    await reactToPost(id, emoji);
    await load();
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[70vh] px-4 py-8 md:px-8 md:py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              Community Showcase
            </h2>
            <button 
              onClick={() => setIsFormVisible(!isFormVisible)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-transform duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2">
              <FaPlus />
              {isFormVisible ? 'Close' : 'Add Yours'}
            </button>
          </div>

          {isFormVisible && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8 transition-all duration-500 ease-in-out">
              <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Share Your Creation</h3>
              {err && <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded-lg mb-4">{err}</p>}
              <form onSubmit={submit} className="space-y-4">
                <select className="w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="art">Art / Image</option>
                  <option value="music">Music / Audio</option>
                  <option value="code">Code Snippet</option>
                  <option value="poem">Poem / Text</option>
                </select>
                <input className="w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Catchy Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <textarea className="w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="A brief description..." rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                {form.type === 'code' ? (
                  <>
                    <select className="w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML</option>
                    </select>
                    <textarea className="w-full font-mono text-sm border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500" rows={8} placeholder="// Paste your code here" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </>
                ) : (
                  <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept={form.type === 'music' ? 'audio/*' : 'image/*'} onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
                )}
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg py-3 transition-all duration-300 ease-in-out disabled:bg-gray-400" disabled={loading}>
                  {loading ? 'Uploading...' : 'Post to Showcase'}
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.length === 0 ? <p className="text-gray-500 dark:text-gray-400 col-span-full text-center">No creations yet. Be the first to share!</p> : posts.map((p) => (
              <ContentCard key={p.id} p={p} react={react} />
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
