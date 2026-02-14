'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers, onUsersUpdate } from '../../../lib/firebase/helpers';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import Skeleton from '../../../components/ui/Skeleton';

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
            <Button ariaLabel={`Make ${user.displayName || user.email || user.uid} an admin`} size="sm" variant="primary" disabled={isProcessing || !user.authExists} onClick={() => setConfirmOpen(true)}>
              Make admin
            </Button>
          ) : (
            <Button ariaLabel={`Revoke admin from ${user.displayName || user.email || user.uid}`} size="sm" variant="danger" disabled={isProcessing || !user.authExists} onClick={() => setConfirmOpen(true)}>
              Revoke
            </Button>
          )}
          {!user.authExists && (
            <div className="text-xs text-gray-500 mt-1">User has no Auth account — cannot set custom claims.</div>
          )}
        </td>
      </tr>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm role change">
        <p className="mb-4">Are you sure you want to <strong>{role === 'admin' ? 'revoke admin from' : 'make admin'}</strong> <span className="font-semibold">{user.displayName || user.email || user.uid}</span>?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!user.authExists} onClick={async () => { setConfirmOpen(false); await onRequestRoleChange(user.uid, role === 'admin' ? 'user' : 'admin'); }}>Confirm</Button>
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
      let unsubscribe;

      (async () => {
        setLoading(true);
        try {
          const initial = await listAllUsers();
          if (Array.isArray(initial)) {
            setUsers(initial.map(u => ({ uid: u.id, ...u })));
          } else {
            setUsers([]);
          }
        } catch (err) {
          console.error('Failed to load users:', err);
          setUsers([]);
        } finally {
          setLoading(false);
        }

        // Listen to real-time updates from the `users` collection so role
        // changes show up instantly in the admin UI (no manual refresh).
        unsubscribe = onUsersUpdate((docs) => {
          setUsers((prev) => {
            const authMap = new Map(prev.map(p => [p.uid, p.authExists]));
            return docs.map(d => ({ uid: d.id, ...d, authExists: authMap.get(d.id) ?? d.authExists ?? false }));
          });
        }, (err) => console.error('onUsersUpdate error:', err));
      })();

      return () => unsubscribe && unsubscribe();
    }
  }, [userProfile]);

  const [processingUid, setProcessingUid] = useState(null);
  const toast = useToast();

  const handleSetRole = async (uid, role) => {
    if (!user) {
      toast('error', 'Not authenticated');
      return;
    }

    if (!uid) {
      toast('error', 'Unable to determine user id for role change');
      return;
    }

    if (!['admin', 'user'].includes(role)) {
      toast('error', 'Invalid role');
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
        toast('error', json.error || json.message || 'Failed to set role');
        return;
      }

      // Refresh the list so role changes are visible in the UI
      const updated = await listAllUsers();
      setUsers(updated.map(u => ({ uid: u.id, ...u })));

      // Prefer server-provided displayName in notification
      const name = json.targetDisplayName || (Array.isArray(updated) ? updated.find(u => u.id === uid)?.displayName : null) || uid;
      const baseMsg = `Successfully set role to ${role} for user ${name}.`;
      const extra = user.uid === uid ? 'Your session has been refreshed.' : 'They may need to sign out and sign in to pick up updated Auth claims.';
      toast('success', `${baseMsg} ${extra}`);

      // If the changed user is the currently signed-in user, refresh profile token/profile locally
      if (user.uid === uid) {
        // Force reload of ID token and userProfile will update via Firestore listener
        await user.getIdToken(true);
      }
    } catch (err) {
      console.error('Error setting role:', err);
      toast('error', 'Error setting role: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessingUid(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton count={6} variant="table" />
      </div>
    );
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
                <UserRow key={user.uid} user={user} onRequestRoleChange={handleSetRole} isProcessing={processingUid === user.uid} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
