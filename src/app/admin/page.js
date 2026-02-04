'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listPendingOpportunities, approveOpportunity, rejectOpportunity, listAllUsers, deleteUser } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [opps, setOpps] = useState([]);
  const [users, setUsers] = useState([]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const u = await getUserDoc(user.uid);
    setDoc(u);
    if (u?.role === 'admin') {
      const pending = await listPendingOpportunities();
      setOpps(pending);
      const allUsers = await listAllUsers();
      setUsers(allUsers);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  async function handleApprove(id) {
    await approveOpportunity(id);
    await load();
  }

  async function handleReject(id) {
    await rejectOpportunity(id);
    await load();
  }

  async function handleDeleteUser(uid) {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(uid);
      await load();
    }
  }

  if (loading || !doc) return <LoadingSpinner />;
  if (doc.role !== 'admin') return <p className='p-8 text-center'>You are not authorized to view this page.</p>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Admin Dashboard</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Pending Opportunities</h2>
              <div className="space-y-4">
                {opps.map((o) => (
                  <div key={o.id} className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-bold text-lg">{o.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{o.org}</p>
                    <p className="mt-2">{o.description}</p>
                    <div className="flex gap-4 mt-4">
                      <button onClick={() => handleApprove(o.id)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                        Approve
                      </button>
                      <button onClick={() => handleReject(o.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {opps.length === 0 && <p className="text-gray-500">No pending opportunities.</p>}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
              <div className="space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{u.displayName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <button onClick={() => handleDeleteUser(u.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
