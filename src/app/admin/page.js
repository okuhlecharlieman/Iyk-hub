'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listPendingOpportunities, approveOpportunity, rejectOpportunity, listAllUsers, deleteUser, listTopUsers } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [opps, setOpps] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const u = await getUserDoc(user.uid);
      setDoc(u);
      if (u?.role === 'admin') {
        const pending = await listPendingOpportunities();
        setOpps(pending);
        const allUsers = await listAllUsers();
        setUsers(allUsers);
        const topUsers = await listTopUsers(10);
        setLeaderboard(topUsers);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
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

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !doc) return <LoadingSpinner />;
  if (doc.role !== 'admin') return <p className='p-8 text-center'>You are not authorized to view this page.</p>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Admin Dashboard</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">User Stats</h2>
                <div className="flex items-center">
                  <p className="text-5xl font-bold">{users.length}</p>
                  <p className="text-lg text-gray-500 ml-4">Total Users</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Pending Opportunities</h2>
                {/* ... pending opportunities UI ... */}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
              {/* ... leaderboard UI ... */}
            </div>
          </div>
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Manage Users</h2>
              <input 
                type="text"
                placeholder="Search by name or email"
                className="border p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-4">
              {filteredUsers.map((u) => (
                <div key={u.id} className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{u.displayName}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                  <div>
                    <button onClick={() => setSelectedUser(u)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-2">
                      Details
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">{selectedUser.displayName}</h2>
            <img src={selectedUser.photoURL || '/logo.png'} alt={selectedUser.displayName} className="w-24 h-24 rounded-full mx-auto mb-4" />
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Points:</strong> {selectedUser.points?.lifetime || 0}</p>
            <p><strong>Bio:</strong> {selectedUser.bio || 'N/A'}</p>
            <p><strong>Skills:</strong> {selectedUser.skills?.join(', ') || 'N/A'}</p>
            <button onClick={() => setSelectedUser(null)} className="mt-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Close
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
