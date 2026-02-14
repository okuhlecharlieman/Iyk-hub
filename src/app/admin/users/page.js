'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers } from '../../../lib/firebase/helpers';
import LoadingSpinner from '../../../components/LoadingSpinner';

const UserRow = ({ user, onRequestRoleChange, isProcessing }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const role = user.role || 'user';

  return (
    <>
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
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {role}
            </span>
            {!user.authExists && (
              <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">no auth</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {role !== 'admin' ? (
            <button disabled={isProcessing || !user.authExists} onClick={() => setConfirmOpen(true)} className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              Make admin
            </button>
          ) : (
            <button disabled={isProcessing || !user.authExists} onClick={() => setConfirmOpen(true)} className="px-3 py-1 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
              Revoke
            </button>
          )}
          {!user.authExists && (
            <div className="text-xs text-gray-500 mt-1">User has no Auth account — cannot set custom claims.</div>
          )}
        </td>
      </tr>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm role change">
        <p className="mb-4">Are you sure you want to <strong>{role === 'admin' ? 'revoke admin from' : 'make admin'}</strong> <span className="font-semibold">{user.displayName || user.email || user.uid}</span>?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700">Cancel</button>
          <button disabled={!user.authExists} onClick={async () => { setConfirmOpen(false); await onRequestRoleChange(user.uid, role === 'admin' ? 'user' : 'admin'); }} className="px-4 py-2 rounded-md bg-blue-600 text-white">Confirm</button>
        </div>
      </Modal>
    </>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      listAllUsers()
        .then((list) => setUsers(list.map(u => ({ uid: u.id, ...u }))))
        .finally(() => setLoading(false));
    }
  }, [userProfile]);

  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message }
  const [processingUid, setProcessingUid] = useState(null);

  const showNotification = (type, message, timeout = 3500) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), timeout);
  };

  const handleSetRole = async (uid, role) => {
    if (!user) {
      showNotification('error', 'Not authenticated');
      return;
    }

    if (!uid) {
      showNotification('error', 'Unable to determine user id for role change');
      return;
    }

    if (!['admin', 'user'].includes(role)) {
      showNotification('error', 'Invalid role');
      return;
    }

    try {
      setProcessingUid(uid);
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
      if (!res.ok) {
        showNotification('error', json.error || json.message || 'Failed to set role');
        return;
      }

      // Refresh the list so role changes are visible in the UI
      const updated = await listAllUsers();
      setUsers(updated.map(u => ({ uid: u.id, ...u })));
      showNotification('success', json.message || 'Role updated');
    } catch (err) {
      console.error('Error setting role:', err);
      showNotification('error', 'Error setting role: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessingUid(null);
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
        {notification && (
          <div className={`mb-4 max-w-xl mx-auto rounded-md p-3 text-sm shadow ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
            {notification.message}
          </div>
        )}

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
                <UserRow key={user.uid} user={user} onRequestRoleChange={handleSetRole} isProcessing={processingUid === user.uid} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
