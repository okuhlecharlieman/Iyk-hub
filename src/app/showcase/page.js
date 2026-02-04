'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { createShowcasePost, listShowcasePosts, reactToPost, uploadToStorage, awardUploadPoints } from '../../lib/firebaseHelpers';

export default function ShowcasePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ type: 'art', title: '', description: '', code: '', language: 'javascript', file: null });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

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
      <div className="min-h-[70vh] flex flex-col items-center px-2 py-8 md:py-16 bg-gradient-to-br from-blue-50 via-yellow-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <h2 className="text-2xl md:text-4xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
          Showcase
        </h2>
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 md:p-8 mt-4 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-3">Share your creation</h2>
              {err ? <p className="text-red-600 mb-2">{err}</p> : null}
              <form onSubmit={submit} className="space-y-3">
                <select className="w-full border p-2 rounded" value={form.type} onChange={(e)=>setForm({...form, type: e.target.value})}>
                  <option value="art">Art / Image</option>
                  <option value="music">Music / Audio</option>
                  <option value="code">Code</option>
                  <option value="poem">Poem / Text</option>
                </select>
                <input className="w-full border p-2 rounded" placeholder="Title" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} />
                <textarea className="w-full border p-2 rounded" placeholder="Description" rows={3} value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} />
                {form.type === 'code' ? (
                  <>
                    <select className="w-full border p-2 rounded" value={form.language} onChange={(e)=>setForm({...form, language: e.target.value})}>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML</option>
                    </select>
                    <textarea className="w-full border p-2 rounded font-mono" rows={6} placeholder="// your code here" value={form.code} onChange={(e)=>setForm({...form, code: e.target.value})} />
                  </>
                ) : (
                  <input type="file" accept={form.type === 'music' ? 'audio/*' : 'image/*'} onChange={(e)=>setForm({...form, file: e.target.files?.[0] || null})} />
                )}
                <button className="w-full bg-neutral-900 text-white rounded py-2" disabled={loading}>
                  {loading ? 'Uploading…' : 'Post'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-4">
              {posts.length === 0 ? <p className="text-neutral-500">No posts yet. Be the first!</p> : null}
              {posts.map((p)=>(
                <div key={p.id} className="bg-white p-4 rounded shadow">
                  <p className="text-sm text-neutral-500 mb-1">{p.type?.toUpperCase()}</p>
                  <h3 className="font-semibold">{p.title}</h3>
                  {p.mediaUrl ? (
                    p.type === 'music' ? (
                      <audio className="w-full mt-2" src={p.mediaUrl} controls />
                    ) : (
                      <img className="mt-2 max-h-64 object-contain" src={p.mediaUrl} alt={p.title} />
                    )
                  ) : null}
                  {p.code ? (
                    <pre className="bg-neutral-900 text-white p-3 rounded mt-2 overflow-auto text-sm"><code>{p.code}</code></pre>
                  ) : null}
                  {p.description ? <p className="mt-2 text-neutral-700">{p.description}</p> : null}
                  <div className="flex gap-3 mt-3">
                    {['❤️','🎉','👍'].map((e)=>(
                      <button key={e} onClick={()=>react(p.id, e)} className="border rounded px-3 py-1">
                        {e} {(p.reactions && p.reactions[e]) || 0}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}