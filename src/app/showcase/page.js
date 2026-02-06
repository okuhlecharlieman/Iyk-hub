'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { createShowcasePost, listShowcasePosts, reactToPost, uploadToStorage, awardUploadPoints } from '../../lib/firebaseHelpers';
import ContentCard from '../../components/ContentCard';
import { FaPlus, FaSpinner, FaTimes } from 'react-icons/fa';

export default function ShowcasePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ type: 'art', title: '', description: '', code: '', language: 'javascript', file: null });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);

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
    if (!form.title || !form.description) {
        setErr("Please fill in a title and description.");
        return;
    }
    setLoading(true);
    setErr('');
    try {
      let mediaUrl = null;
      if (form.file) {
        mediaUrl = await uploadToStorage(form.file, `showcase/${user.uid}`);
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
      e.target.reset();
      setIsFormVisible(false);
      await load();
    } catch (e) {
      setErr(e.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function react(id, emoji) {
    await reactToPost(id, emoji);
    await load();
  }

  const inputStyles = "w-full border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors";
  const fileInputStyles = "w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 dark:file:bg-blue-800 file:text-blue-700 dark:file:text-blue-200 hover:file:bg-blue-200 dark:hover:file:bg-blue-700 transition-colors";

  return (
    <ProtectedRoute>
      <div className="min-h-[70vh] px-4 py-8 md:px-8 md:py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              Community Showcase
            </h2>
            <button 
              onClick={() => setIsFormVisible(!isFormVisible)}
              className={`font-bold py-3 px-6 rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2 shadow-md focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isFormVisible ? 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300'}`}>
              {isFormVisible ? <FaTimes /> : <FaPlus />}
              <span className="hidden md:block">{isFormVisible ? 'Close Form' : 'Share Yours'}</span>
            </button>
          </div>

          {isFormVisible && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-10 border border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Share Your Creation</h3>
              <form onSubmit={submit} className="space-y-5">
                <select className={inputStyles} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="art">Art / Image</option>
                  <option value="music">Music / Audio</option>
                  <option value="code">Code Snippet</option>
                </select>
                <input className={inputStyles} placeholder="Catchy Title*" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <textarea className={inputStyles} placeholder="A brief description...*" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required/>
                {form.type === 'code' ? (
                  <div className='space-y-2'>
                    <select className={inputStyles} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="typescript">TypeScript</option>
                    </select>
                    <textarea className={`${inputStyles} font-mono text-sm`} rows={8} placeholder="// Paste your code here" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </div>
                ) : (
                  <input type="file" className={fileInputStyles} accept={form.type === 'music' ? 'audio/*' : 'image/*'} onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
                )}
                {err && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-lg text-sm">{err}</p>}
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg py-3 px-6 transition-all duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg" disabled={loading}>
                  {loading ? <><FaSpinner className="animate-spin"/> Posting...</> : 'Post to Showcase'}
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.length === 0 ? <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-10">No creations yet. Be the first to share!</p> : posts.map((p) => (
              <ContentCard key={p.id} p={p} react={react} />
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
