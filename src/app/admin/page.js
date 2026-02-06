'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listPendingOpportunities, approveOpportunity, rejectOpportunity, listAllUsers, deleteUser, listTopUsers } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/admin/StatCard';
import PendingOppsCard from '../../components/admin/PendingOppsCard';
import LeaderboardCard from '../../components/admin/LeaderboardCard';
import UserManagementCard from '../../components/admin/UserManagementCard';
import { FaUsers, FaClock } from 'react-icons/fa';

export default function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [opps, setOpps] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const u = await getUserDoc(user.uid);
      setDoc(u);
      if (u?.role === 'admin') {
        const [pending, allUsers, topUsers] = await Promise.all([
          listPendingOpportunities(),
          listAllUsers(),
          listTopUsers(10),
        ]);
        setOpps(pending);
        setUsers(allUsers);
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
    if (window.confirm('Are you sure you want to permanently delete this user and all their data? This action cannot be undone.')) {
      await deleteUser(uid);
      await load();
    }
  }

  if (loading || !user) return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>;
  if (doc?.role !== 'admin') return <p className='p-8 text-center text-lg text-red-500'>You are not authorized to view this page.</p>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">Admin Dashboard</h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Users" value={users.length} icon={<FaUsers size={32} className="text-blue-500" />} />
            <StatCard title="Pending Approvals" value={opps.length} icon={<FaClock size={32} className="text-yellow-500" />} />
            {/* Add more StatCards as needed */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-8">
              <UserManagementCard users={users} onSelectUser={setSelectedUser} onDeleteUser={handleDeleteUser} />
            </div>

            {/* Sidebar Column */}
            <div className="space-y-8">
              <PendingOppsCard opportunities={opps} onApprove={handleApprove} onReject={handleReject} />
              <LeaderboardCard users={leaderboard} />
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full m-4">
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{selectedUser.displayName}</h2>
                <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&times;</button>
            </div>
            <img src={selectedUser.photoURL || '/logo.png'} alt={selectedUser.displayName} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-200 dark:border-gray-700" />
            <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedUser.email}</span></p>
                <p><strong>Points:</strong> <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedUser.points?.lifetime || 0}</span></p>
                <p><strong>Bio:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedUser.bio || 'N/A'}</span></p>
                <p><strong>Skills:</strong> <span className="text-gray-600 dark:text-gray-300">{selectedUser.skills?.join(', ') || 'N/A'}</span></p>
            </div>
            <button onClick={() => setSelectedUser(null)} className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 font-bold py-2 px-4 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
