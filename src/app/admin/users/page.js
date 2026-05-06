'use client';
import { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers, onUsersUpdate } from '../../../lib/firebase/helpers';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import Skeleton from '../../../components/ui/Skeleton';
import { FaSearch, FaUserShield, FaUserTimes, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';

const UserRow = ({ user, onRequestUpdate, onRequestDelete, isProcessing }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const role = user.role || 'user';
  const canManageClaims = user.authExists || Boolean(user.email);

  return (
    <>
      {/* Desktop row */}
      <tr className="hidden sm:table-row border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={user.photoURL || '/logo.png'} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" alt={user.displayName || 'avatar'} />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.displayName || 'Unnamed'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{user.uid?.slice(0, 12)}...</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{canManageClaims ? user.email : '—'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
            role.toLowerCase() === 'admin'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {role.toLowerCase() === 'admin' ? <FaUserShield className="mr-1" /> : null}
            {role}
          </span>
          {!canManageClaims && (
            <span className="ml-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-lg">setup needed</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {role !== 'admin' ? (
              <Button ariaLabel={`Make ${user.displayName || user.email || user.uid} an admin`} size="sm" variant="primary" disabled={isProcessing || !canManageClaims} onClick={() => setConfirmOpen(true)}>
                <FaUserShield className="mr-1" /> Promote
              </Button>
            ) : (
              <Button ariaLabel={`Revoke admin from ${user.displayName || user.email || user.uid}`} size="sm" variant="secondary" disabled={isProcessing || !canManageClaims} onClick={() => setConfirmOpen(true)}>
                <FaUserTimes className="mr-1" /> Revoke
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)} disabled={isProcessing}><FaEdit /></Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)} disabled={isProcessing}><FaTrash /></Button>
          </div>
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={4} className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start gap-3">
              <img src={user.photoURL || '/logo.png'} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 flex-shrink-0" alt={user.displayName || 'avatar'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.displayName || 'Unnamed'}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    role.toLowerCase() === 'admin'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>{role}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{canManageClaims ? user.email : 'No email'}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {role !== 'admin' ? (
                    <Button size="sm" variant="primary" disabled={isProcessing || !canManageClaims} onClick={() => setConfirmOpen(true)}>Promote</Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled={isProcessing || !canManageClaims} onClick={() => setConfirmOpen(true)}>Revoke</Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)} disabled={isProcessing}><FaEdit /></Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)} disabled={isProcessing}><FaTrash /></Button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm role change">
        <p className="mb-4 text-gray-700 dark:text-gray-300">Are you sure you want to <strong>{role === 'admin' ? 'revoke admin from' : 'make admin'}</strong> <span className="font-semibold">{user.displayName || user.email || user.uid}</span>?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!canManageClaims} onClick={async () => { setConfirmOpen(false); await onRequestUpdate(user.authUid || user.uid || user.id, { role: role === 'admin' ? 'user' : 'admin' }); }}>Confirm</Button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit user">
        <div className="flex flex-col gap-4">
            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                <input
                    type="text"
                    name="displayName"
                    id="displayName"
                    defaultValue={user.displayName}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={canManageClaims ? user.email : ''}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {!canManageClaims && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Add an email to create a Firebase Auth account for this user.</p>
                )}
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={async (e) => {
                    const container = e.target.closest('.flex-col');
                    const newDisplayName = container.querySelector('#displayName').value;
                    const newEmail = container.querySelector('#email').value;
                    const payload = { displayName: newDisplayName };
                    if (newEmail.trim()) payload.email = newEmail.trim();
                    setEditOpen(false);
                    await onRequestUpdate(user.authUid || user.uid || user.id, payload);
                }}>Save Changes</Button>
            </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm deletion">
        <p className="mb-4 text-gray-700 dark:text-gray-300">Are you sure you want to <strong className="text-red-600">delete</strong> <span className="font-semibold">{user.displayName || user.email || user.uid}</span>? This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => { setDeleteOpen(false); await onRequestDelete(user.authUid || user.uid || user.id); }}>Delete</Button>
        </div>
      </Modal>
    </>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role?.toLowerCase() === 'admin' && user) {
      let unsubscribe;

      (async () => {
        setLoading(true);
        try {
          const initial = await listAllUsers();
          if (Array.isArray(initial)) {
            setUsers(initial.map(u => ({ ...u, uid: u.uid || u.authUid || u.id })));
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
                const newUsersMap = new Map();
                const prevUsersMap = new Map(prevUsers.map(u => [(u.uid || u.id), u]));
                docs.forEach(userDoc => {
                    const uid = userDoc.uid || userDoc.authUid || userDoc.id;
                    const existingUser = prevUsersMap.get(uid) || {};
                    newUsersMap.set(uid, { ...existingUser, ...userDoc, uid, id: userDoc.id || existingUser.id || uid });
                });
                prevUsersMap.forEach((user, uid) => {
                    if (!newUsersMap.has(uid)) {
                        if (!user.hasOwnProperty('role')) {
                            newUsersMap.set(uid, user);
                        }
                    }
                });
                return Array.from(newUsersMap.values());
            });
        }, (err) => console.error('onUsersUpdate error:', err));
      })();

      return () => unsubscribe && unsubscribe();
    }
  }, [userProfile, user]);

  const [processingUid, setProcessingUid] = useState(null);
  const toast = useToast();

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const adminCount = users.filter(u => (u.role || '').toLowerCase() === 'admin').length;

  const handleUpdateUser = async (uid, updateData) => {
    if (!user) { toast('error', 'Not authenticated'); return; }
    if (!uid) { toast('error', 'Unable to determine user id'); return; }
    try {
        setProcessingUid(uid);
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ uid, ...updateData }),
        });
        const json = await res.json();
        if (!res.ok) { toast('error', json.error || json.message || 'Failed to update user'); return; }
        if (json.authWasCreated) {
            toast('success', `Created Auth account and updated user.`);
            return;
        }
        toast('success', 'User updated successfully.');
    } catch (err) {
        console.error('Error updating user:', err);
        toast('error', 'Error updating user: ' + (err.message || 'Unknown error'));
    } finally {
        setProcessingUid(null);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!user) { toast('error', 'Not authenticated'); return; }
    if (!uid) { toast('error', 'Unable to determine user id'); return; }
    try {
        setProcessingUid(uid);
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ uid }),
        });
        const json = await res.json();
        if (!res.ok) { toast('error', json.error || json.message || 'Failed to delete user'); return; }
        toast('success', 'User deleted successfully.');
    } catch (err) {
        console.error('Error deleting user:', err);
        toast('error', 'Error deleting user: ' + (err.message || 'Unknown error'));
    } finally {
        setProcessingUid(null);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton count={6} variant="table" /></div>;
  }

  if (userProfile?.role?.toLowerCase() !== 'admin') {
    return <p className="text-center py-20 text-gray-500 dark:text-gray-400">You are not authorized to view this page.</p>;
  }

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {users.length} total users · {adminCount} admins
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {search && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{filteredUsers.length} results</span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="hidden sm:table-header-group bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <FaUsers className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{search ? 'No users match your search.' : 'No users found.'}</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const userKey = u.uid || u.authUid || u.id;
                  return (
                    <UserRow
                      key={userKey}
                      user={{ ...u, uid: userKey }}
                      onRequestUpdate={handleUpdateUser}
                      onRequestDelete={handleDeleteUser}
                      isProcessing={processingUid === userKey}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
