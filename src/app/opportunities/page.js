'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { listApprovedOpportunities, submitOpportunity, listPendingOpportunities, approveOpportunity, rejectOpportunity, getUserDoc } from '../../lib/firebaseHelpers';

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [form, setForm] = useState({ title: '', org: '', description: '', link: '', tags: '' });
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    const a = await listApprovedOpportunities(30);
    setApproved(a);
    if (user) {
      const u = await getUserDoc(user.uid);
      setIsAdmin(u?.role === 'admin');
      if (u?.role === 'admin') {
        const p = await listPendingOpportunities(30);
        setPending(p);
      }
    }
  }

  useEffect(()=>{ load(); }, [user]);

  async function submit(e) {
    e.preventDefault();
    if (!user) return;
    await submitOpportunity(
      { title: form.title, org: form.org, description: form.description, link: form.link, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) },
      user.uid
    );
    setForm({ title: '', org: '', description: '', link: '', tags: '' });
    await load();
  }

  return (
    <ProtectedRoute>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-3">Submit Opportunity</h2>
          <form onSubmit={submit} className="space-y-3">
            <input className="w-full border p-2 rounded" placeholder="Title" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} />
            <input className="w-full border p-2 rounded" placeholder="Organization" value={form.org} onChange={(e)=>setForm({...form, org: e.target.value})} />
            <input className="w-full border p-2 rounded" placeholder="Link (https://…)" value={form.link} onChange={(e)=>setForm({...form, link: e.target.value})} />
            <textarea className="w-full border p-2 rounded" placeholder="Description" rows={3} value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} />
            <input className="w-full border p-2 rounded" placeholder="Tags (comma separated)" value={form.tags} onChange={(e)=>setForm({...form, tags: e.target.value})} />
            <button className="w-full bg-neutral-900 text-white rounded py-2">Submit</button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-semibold">Approved</h2>
          {approved.length === 0 ? <p className="text-neutral-500">No opportunities yet.</p> : null}
          {approved.map((o)=>(
            <a key={o.id} href={o.link} target="_blank" className="block bg-white p-4 rounded shadow hover:bg-neutral-50">
              <p className="font-medium">{o.title} <span className="text-sm text-neutral-500">— {o.org}</span></p>
              <p className="text-sm mt-1">{o.description}</p>
            </a>
          ))}

          {isAdmin ? (
            <div className="mt-6">
              <h3 className="font-semibold">Pending (admin)</h3>
              {pending.length === 0 ? <p className="text-neutral-500">No pending items.</p> : null}
              {pending.map((o)=>(
                <div key={o.id} className="bg-white p-4 rounded shadow flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{o.title} <span className="text-sm text-neutral-500">— {o.org}</span></p>
                    <p className="text-sm mt-1">{o.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async()=>{ await approveOpportunity(o.id); await load(); }} className="px-3 py-1 rounded bg-green-600 text-white">Approve</button>
                    <button onClick={async()=>{ await rejectOpportunity(o.id); await load(); }} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}