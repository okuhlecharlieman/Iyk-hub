'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers } from '../../../lib/firebase/helpers';
import LoadingSpinner from '../../../components/LoadingSpinner';

const UserRow = ({ user, onSetRole }) => {
  const [processing, setProcessing] = useState(false);
  const role = user.role || 'user';

  const handleClick = async (newRole) => {
    setProcessing(true);
    try {
      await onSetRole(user.uid, newRole);
    } catch (err) {
      console.error(err);
      alert('Failed to update role: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3 flex items-center gap-3">
        <img src={user.photoURL || '/logo.png'} className="w-8 h-8 rounded-full" alt={user.displayName || 'avatar'} />
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{user.displayName || user.email || user.uid}</div>
          <div className="text-xs text-gray-500 truncate">{user.uid}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.email || '—'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {role !== 'admin' ? (
          <button disabled={processing} onClick={() => handleClick('admin')} className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
            Make admin
          </button>
        ) : (
          <button disabled={processing} onClick={() => handleClick('user')} className="px-3 py-1 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
            Revoke
          </button>
        )}
      </td>
    </tr>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      listAllUsers().then(setUsers).finally(() => setLoading(false));
    }
  }, [userProfile]);

  const handleSetRole = async (uid, role) => {
    if (!user) {
      alert('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/set-user-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, role }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to set role');

      // Refresh the list so role changes are visible in the UI
      const updated = await listAllUsers();
      setUsers(updated);
      alert(json.message || 'Role updated');
    } catch (err) {
      console.error('Error setting role:', err);
      alert('Error setting role: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (userProfile?.role !== 'admin') {
    return <p>You are not authorized to view this page.</p>;
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Admin: All Users</h1>
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.uid} user={user} onSetRole={handleSetRole} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
