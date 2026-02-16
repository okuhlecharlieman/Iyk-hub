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

const UserRow = ({ user, onRequestUpdate, onRequestDelete, isProcessing }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)} className="ml-2" disabled={isProcessing}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)} className="ml-2" disabled={isProcessing}>Delete</Button>
          {!user.authExists && (
            <div className="text-xs text-gray-500 mt-1">User has no Auth account — cannot set custom claims.</div>
          )}
        </td>
      </tr>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm role change">
        <p className="mb-4">Are you sure you want to <strong>{role === 'admin' ? 'revoke admin from' : 'make admin'}</strong> <span className="font-semibold">{user.displayName || user.email || user.uid}</span>?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!user.authExists} onClick={async () => { setConfirmOpen(false); await onRequestUpdate(user.uid, { role: role === 'admin' ? 'user' : 'admin' }); }}>Confirm</Button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit user">
        <div className="flex flex-col gap-4">
            <p>Editing user: <span className="font-semibold">{user.displayName || user.email || user.uid}</span></p>
            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
                <input
                    type="text"
                    name="displayName"
                    id="displayName"
                    defaultValue={user.displayName}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={async (e) => {
                    const newDisplayName = e.target.closest('.flex-col').querySelector('#displayName').value;
                    setEditOpen(false);
                    await onRequestUpdate(user.uid, { displayName: newDisplayName });
                }}>Save</Button>
            </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm deletion">
        <p className="mb-4">Are you sure you want to <strong>delete</strong> <span className="font-semibold">{user.displayName || user.email || user.uid}</span>?</p>
        <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => { setDeleteOpen(false); await onRequestDelete(user.uid); }}>Confirm</Button>
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
            setUsers(initial.map(u => ({ ...u, uid: u.uid || u.id })));
          } else {
            setUsers([]);
          }
        } catch (err) {
          console.error('Failed to load users:', err);
          setUsers([]);
        } finally {
          setLoading(false);
        }

        unsubscribe = onUsersUpdate((docs) => {
            setUsers((prevUsers) => {
                const usersMap = new Map(prevUsers.map(u => [u.uid, u]));
                docs.forEach(userDoc => {
                    const uid = userDoc.id;
                    const existingUser = usersMap.get(uid) || {};
                    usersMap.set(uid, { ...existingUser, ...userDoc, uid });
                });
                return Array.from(usersMap.values());
            });
        }, (err) => console.error('onUsersUpdate error:', err));

      })();

      return () => unsubscribe && unsubscribe();
    }
  }, [userProfile]);

  const [processingUid, setProcessingUid] = useState(null);
  const toast = useToast();

  const handleUpdateUser = async (uid, updateData) => {
    if (!user) {
        toast('error', 'Not authenticated');
        return;
    }

    if (!uid) {
        toast('error', 'Unable to determine user id for update');
        return;
    }

    try {
        setProcessingUid(uid);
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid, ...updateData }),
        });

        const json = await res.json();
        if (!res.ok) {
            toast('error', json.error || json.message || 'Failed to update user');
            return;
        }

        toast('success', `Successfully updated user ${uid}.`);

    } catch (err) {
        console.error('Error updating user:', err);
        toast('error', 'Error updating user: ' + (err.message || 'Unknown error'));
    } finally {
        setProcessingUid(null);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!user) {
        toast('error', 'Not authenticated');
        return;
    }

    if (!uid) {
        toast('error', 'Unable to determine user id for deletion');
        return;
    }

    try {
        setProcessingUid(uid);
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid }),
        });

        const json = await res.json();
        if (!res.ok) {
            toast('error', json.error || json.message || 'Failed to delete user');
            return;
        }

        toast('success', `Successfully deleted user ${uid}.`);

    } catch (err) {
        console.error('Error deleting user:', err);
        toast('error', 'Error deleting user: ' + (err.message || 'Unknown error'));
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
                <UserRow key={user.uid} user={user} onRequestUpdate={handleUpdateUser} onRequestDelete={handleDeleteUser} isProcessing={processingUid === user.uid} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
