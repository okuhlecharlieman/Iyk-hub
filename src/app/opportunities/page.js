'use client';
import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { listApprovedOpportunities, submitOpportunity, listPendingOpportunities, approveOpportunity, rejectOpportunity, getUserDoc } from '../../lib/firebaseHelpers';

function EditOpportunityModal({ open, onClose, onSave, opportunity }) {
  const [form, setForm] = useState({ ...opportunity });
  const firstInput = useRef(null);
  useEffect(() => { if (open && firstInput.current) firstInput.current.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-gradient-to-br from-yellow-100 via-teal-100 to-blue-100 rounded shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-xl hover:text-red-500">×</button>
        <h2 className="font-bold mb-4 text-blue-700">Edit Opportunity</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
          <input ref={firstInput} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400" placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))} />
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400" placeholder="Organization" value={form.org} onChange={e=>setForm(f=>({...f, org: e.target.value}))} />
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400" placeholder="Link (https://…)" value={form.link} onChange={e=>setForm(f=>({...f, link: e.target.value}))} />
          <textarea className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400" placeholder="Description" rows={3} value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400" placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm(f=>({...f, tags: e.target.value}))} />
          <button className="w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded py-2 font-semibold hover:from-blue-600 hover:to-teal-500 transition">Save</button>
        </form>
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [form, setForm] = useState({ title: '', org: '', description: '', link: '', tags: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, opportunity: null });

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
      <EditOpportunityModal
        open={editModal.open}
        opportunity={editModal.opportunity}
        onClose={() => setEditModal({ open: false, opportunity: null })}
        onSave={async (form) => {
          await submitOpportunity({ ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) }, form.ownerId || user.uid, form.id, true);
          setEditModal({ open: false, opportunity: null });
          await load();
        }}
      />
      <div className="grid md:grid-cols-3 gap-6 px-2 md:px-0 py-6 bg-gradient-to-br from-yellow-50 via-blue-50 to-teal-50 min-h-screen">
        <div className="bg-white p-4 rounded shadow border border-yellow-200">
          <h2 className="font-semibold mb-3 text-yellow-700">Submit Opportunity</h2>
          <form onSubmit={submit} className="space-y-3">
            <input className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400" placeholder="Title" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} />
            <input className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400" placeholder="Organization" value={form.org} onChange={(e)=>setForm({...form, org: e.target.value})} />
            <input className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400" placeholder="Link (https://…)" value={form.link} onChange={(e)=>setForm({...form, link: e.target.value})} />
            <textarea className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400" placeholder="Description" rows={3} value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} />
            <input className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400" placeholder="Tags (comma separated)" value={form.tags} onChange={(e)=>setForm({...form, tags: e.target.value})} />
            <button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded py-2 font-semibold hover:from-yellow-500 hover:to-yellow-700 transition">Submit</button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-semibold text-blue-700">Approved</h2>
          {approved.length === 0 ? <p className="text-neutral-500">No opportunities yet.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approved.map((o)=>(
            <div key={o.id} className="relative group bg-white p-4 rounded shadow border border-blue-100 hover:shadow-lg transition flex flex-col min-h-[180px]">
              <a href={o.link} target="_blank" className="flex-1">
                <p className="font-medium text-lg text-blue-900">{o.title} <span className="text-sm text-neutral-500">— {o.org}</span></p>
                <p className="text-sm mt-1 text-blue-700">{o.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {o.tags && o.tags.map((tag, i) => (
                    <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{tag}</span>
                  ))}
                </div>
              </a>
              {(isAdmin || o.ownerId === user?.uid) && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={()=>setEditModal({ open: true, opportunity: o })} className="px-2 py-1 rounded bg-yellow-400 text-black text-xs shadow hover:bg-yellow-500">Edit</button>
                  <button onClick={async()=>{
                    if (confirm("Delete this opportunity?")) {
                      await rejectOpportunity(o.id, true); // true = delete
                      await load();
                    }
                  }} className="px-2 py-1 rounded bg-red-600 text-white text-xs shadow hover:bg-red-700">Delete</button>
                </div>
              )}
            </div>
          ))}
          </div>

          {isAdmin ? (
            <div className="mt-6">
              <h3 className="font-semibold text-teal-700">Pending (admin)</h3>
              {pending.length === 0 ? <p className="text-neutral-500">No pending items.</p> : null}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((o)=>(
                <div key={o.id} className="bg-white p-4 rounded shadow flex flex-col border border-teal-100 hover:shadow-lg transition">
                  <div className="flex-1">
                    <p className="font-medium text-lg text-teal-900">{o.title} <span className="text-sm text-neutral-500">— {o.org}</span></p>
                    <p className="text-sm mt-1 text-teal-700">{o.description}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={async()=>{ await approveOpportunity(o.id); await load(); }} className="px-3 py-1 rounded bg-green-600 text-white shadow hover:bg-green-700">Approve</button>
                    <button onClick={async()=>{ await rejectOpportunity(o.id); await load(); }} className="px-3 py-1 rounded bg-red-600 text-white shadow hover:bg-red-700">Reject</button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}