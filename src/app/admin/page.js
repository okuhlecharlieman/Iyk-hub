'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { getUserDoc, listPendingOpportunities, approveOpportunity, rejectOpportunity, deleteUser, listTopUsers } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/admin/StatCard';
import PendingOppsCard from '../../components/admin/PendingOppsCard';
import LeaderboardCard from '../../components/admin/LeaderboardCard';
import UserManagementCard from '../../components/admin/UserManagementCard';
import Modal from '../../components/Modal';
import { FaUsers, FaClock, FaTrophy } from 'react-icons/fa';

export default function AdminPage() {
  const { user, idToken } = useAuth(); // Assuming idToken is available from your AuthContext
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [opps, setOpps] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  async function listAllUsersSecurely() {
    if (!idToken) throw new Error("No ID token available for authentication.");
    const response = await fetch('/api/list-users', {
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch users securely.');
    }
    return data.users;
  }

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const u = await getUserDoc(user.uid);
      setDoc(u);
      if (u?.role === 'admin') {
        const [pending, allUsers, topUsers] = await Promise.all([
          listPendingOpportunities(),
          listAllUsersSecurely(),
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
    if (user && idToken) {
        load();
    }
  }, [user, idToken]);

  const handleSelectUser = async (userToSelect) => {
    setSelectedUser(userToSelect); // The data is now complete, no need to re-fetch
  };

  async function handleApprove(id) { await approveOpportunity(id); await load(); }
  async function handleReject(id) { await rejectOpportunity(id); await load(); }
  async function handleDeleteUser(uid) {
    if (window.confirm('Are you sure you want to permanently delete this user and all their data? This action cannot be undone.')) {
      await deleteUser(uid); // This helper might need to be converted to a secure API call as well
      if(selectedUser?.id === uid) setSelectedUser(null);
      await load(); // Reload all data
    }
  }

  if (loading || !user) return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>;
  if (doc?.role !== 'admin') return <p className='p-8 text-center text-lg text-red-500'>You are not authorized to view this page.</p>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">Admin Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Users" value={users.length} icon={<FaUsers size={32} className="text-blue-500" />} />
            <StatCard title="Pending Approvals" value={opps.length} icon={<FaClock size={32} className="text-yellow-500" />} />
            <StatCard title="Top Player" value={leaderboard[0]?.displayName || 'N/A'} icon={<FaTrophy size={32} className="text-green-500" />} subtitle={`with ${leaderboard[0]?.points?.lifetime || 0} points`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 space-y-8">
              <UserManagementCard users={users} onSelectUser={handleSelectUser} onDeleteUser={handleDeleteUser} />
            </div>
            <div className="space-y-8">
              <PendingOppsCard opportunities={opps} onApprove={handleApprove} onReject={handleReject} />
              <LeaderboardCard users={leaderboard} />
            </div>
          </div>
        </div>
      </div>

      {selectedUser && (
        <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title={selectedUser.displayName}>
            {isModalLoading ? <div className="flex justify-center items-center h-56"><LoadingSpinner /></div> : <>
                <img src={selectedUser.photoURL || '/logo.png'} alt={selectedUser.displayName} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-200 dark:border-gray-700 shadow-lg" />
                <div className="space-y-3 text-center">
                    <p><strong>Email:</strong> <span className="text-gray-600 dark:text-gray-300 font-mono text-sm">{selectedUser.email}</span></p>
                    <p><strong>Points:</strong> <span className="font-semibold text-blue-600 dark:text-blue-400 text-lg">{selectedUser.points?.lifetime || 0}</span></p>
                    <div>
                        <p className="font-semibold">Bio</p>
                        <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">{selectedUser.bio || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Skills</p>
                        <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">{selectedUser.skills?.join(', ') || 'N/A'}</p>
                    </div>
                </div>
            </>}
        </Modal>
      )}
    </ProtectedRoute>
  );
}
