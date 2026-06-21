'use client';
/**
 * Page component for /admin/users.
 */
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers, onUsersUpdate } from '../../../lib/firebase/helpers';
import { subscribeOnlineCount } from '../../../lib/presence';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import Skeleton from '../../../components/ui/Skeleton';
import { FaSearch, FaUserShield, FaEdit, FaTrash, FaUsers, FaUserCog, FaCircle, FaBan, FaSortUp, FaSortDown, FaSort } from 'react-icons/fa';
import { ROLE_OPTIONS, canManageTeam, formatRoleLabel, getRoleDefinition } from '../../../lib/roles';

const roleBadgeClasses = {
  business_owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  operations: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  developer_support: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  customer_support: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  client: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  user: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

/** RoleBadge React component. */
const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${roleBadgeClasses[role] || roleBadgeClasses.user}`}>
    {canManageTeam(role) ? <FaUserShield className="mr-1" /> : null}
    {formatRoleLabel(role)}
  </span>
);

/** Formats/parses data — parseDateValue. */
const parseDateValue = (value) => {
  if (!value) return null;
  if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
  if (value?._seconds != null || value?.seconds != null) {
    const seconds = Number(value._seconds ?? value.seconds);
    const nanoseconds = Number(value._nanoseconds ?? value.nanoseconds ?? 0);
    const parsed = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Fetches/retrieves data — getTimeRemaining. */
const getTimeRemaining = (value) => {
  const target = parseDateValue(value);
  if (!target) return null;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

/** UserRow React component. */
const UserRow = ({ user, onRequestUpdate, onRequestDelete, onRequestSuspend, isProcessing, isOnline }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isSuspended = user.accountStatus === 'suspended';
  /** role. */
  const role = (user.role || 'user').toLowerCase();
  const roleDefinition = getRoleDefinition(role);
  const canManageClaims = user.authExists || Boolean(user.email);
  const creationDate = user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : (user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A');
  const lastSeen = user.streak?.lastLoginDate ? new Date(user.streak.lastLoginDate).toLocaleDateString() : 'N/A';
  const boostExpiry = parseDateValue(user.activeBoost?.expiresAt);
  const boostRemaining = getTimeRemaining(user.activeBoost?.expiresAt);


  return (
    <>
      {/* Desktop row */}
      <tr className="hidden sm:table-row border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
                <img src={user.photoURL || '/logo.png'} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" alt={user.displayName || 'avatar'} />
                {isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-gray-800"></span>}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.displayName || 'Unnamed'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{user.uid?.slice(0, 12)}...</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{canManageClaims ? user.email : '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{creationDate}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lastSeen}</td>
        <td className="px-4 py-3">
          <RoleBadge role={role} />
          {isSuspended && (
            <span className="ml-2 text-xs text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-lg">Suspended</span>
          )}
          {user.accountStatus === 'pending_deletion' && (
            <span className="ml-2 text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-lg">Pending Deletion</span>
          )}
          {user.activeBoost && (
            <span className="ml-2 text-xs text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-lg">
              Boost: {boostRemaining || 'Active'}
            </span>
          )}
          {!canManageClaims && (
            <span className="ml-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-lg">setup needed</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{user.points?.lifetime ?? user.points ?? 0}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Button ariaLabel={`Change role for ${user.displayName || user.email || user.uid}`} size="sm" variant="primary" disabled={isProcessing || !canManageClaims} onClick={() => setConfirmOpen(true)}>
              <FaUserCog className="mr-1" /> Role
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)} disabled={isProcessing}><FaEdit /></Button>
            <Button size="sm" variant={isSuspended ? 'secondary' : 'warning'} onClick={() => setSuspendOpen(true)} disabled={isProcessing}><FaBan /></Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)} disabled={isProcessing}><FaTrash /></Button>
          </div>
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={7} className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                    <img src={user.photoURL || '/logo.png'} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" alt={user.displayName || 'avatar'} />
                    {isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-gray-800"></span>}
                </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.displayName || 'Unnamed'}</p>
                  <RoleBadge role={role} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{canManageClaims ? user.email : 'No email'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Joined: {creationDate}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last Seen: {lastSeen}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Points: <span className="font-semibold text-purple-600 dark:text-purple-400">{user.points?.lifetime ?? user.points ?? 0}</span></p>
                {user.activeBoost && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Active Boost: {user.activeBoost.plan || 'active'}{boostRemaining ? ` • ${boostRemaining}` : ''}
                  </p>
                )}
                {isSuspended && <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">Account Suspended</p>}
                {user.accountStatus === 'pending_deletion' && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">Pending Deletion</p>}
                <div className="flex items-center gap-1.5 mt-2">
                  <Button size="sm" variant="primary" disabled={isProcessing || !canManageClaims} onClick={() => setConfirmOpen(true)}>Role</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)} disabled={isProcessing}><FaEdit /></Button>
                  <Button size="sm" variant={isSuspended ? 'secondary' : 'warning'} onClick={() => setSuspendOpen(true)} disabled={isProcessing}><FaBan /></Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)} disabled={isProcessing}><FaTrash /></Button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Change role">
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
            <p className="text-sm text-gray-700 dark:text-gray-300">Assign a business role to <span className="font-semibold">{user.displayName || user.email || user.uid}</span>.</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current role: {roleDefinition.label} · {roleDefinition.summary}</p>
          </div>
          <div>
            <label htmlFor={`role-${user.uid}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              id={`role-${user.uid}`}
              defaultValue={role}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!canManageClaims} onClick={async () => { const selectedRole = document.getElementById(`role-${user.uid}`)?.value || role; setConfirmOpen(false); await onRequestUpdate(user.authUid || user.uid || user.id, { role: selectedRole }); }}>Save role</Button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit user">
        <div className="flex flex-col gap-4">
            {user.activeBoost && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Active Boost: {(user.activeBoost.plan || 'active').toUpperCase()}</p>
                <p className="text-emerald-700 dark:text-emerald-400 mt-1">
                  Expires: {boostExpiry ? boostExpiry.toLocaleString() : 'N/A'}
                </p>
                <p className="text-emerald-700 dark:text-emerald-400">
                  Time Remaining: {boostRemaining || 'N/A'}
                </p>
              </div>
            )}
            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                <input
                    type="text"
                    name="displayName"
                    id={`edit-displayName-${user.uid}`}
                    defaultValue={user.displayName}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                    type="email"
                    name="email"
                    id={`edit-email-${user.uid}`}
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
                <Button variant="primary" size="sm" onClick={async () => {
                    const newDisplayName = document.getElementById(`edit-displayName-${user.uid}`).value;
                    const newEmail = document.getElementById(`edit-email-${user.uid}`).value;
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

      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title={isSuspended ? 'Unsuspend user' : 'Suspend user'}>
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {isSuspended
              ? <>Unsuspend <span className="font-semibold">{user.displayName || user.email || user.uid}</span>? Their account will be re-enabled.</>
              : <>Suspend <span className="font-semibold">{user.displayName || user.email || user.uid}</span>? They will be logged out and unable to access their account.</>
            }
          </p>
          {!isSuspended && (
            <div>
              <label htmlFor={`suspend-reason-${user.uid}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
              <input
                type="text"
                id={`suspend-reason-${user.uid}`}
                placeholder="e.g. Policy violation"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button
              variant={isSuspended ? 'primary' : 'danger'}
              size="sm"
              onClick={async () => {
                const reason = document.getElementById(`suspend-reason-${user.uid}`)?.value || '';
                setSuspendOpen(false);
                await onRequestSuspend(user.authUid || user.uid || user.id, isSuspended ? 'unsuspend' : 'suspend', reason);
              }}
            >
              {isSuspended ? 'Unsuspend' : 'Suspend'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

/** AdminUsersPage — main page component. */
export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('displayName');
  const [sortDir, setSortDir] = useState('asc');
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (canManageTeam(userProfile?.role) && user) {
      let unsubscribeUsers, unsubscribeOnline;

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

        unsubscribeUsers = onUsersUpdate((docs) => {
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

        unsubscribeOnline = subscribeOnlineCount(setOnlineUsers);
      })();

      return () => {
          if (unsubscribeUsers) unsubscribeUsers();
          if (unsubscribeOnline) unsubscribeOnline();
      }
    }

    setLoading(false);
  }, [userProfile, user]);

  const [processingUid, setProcessingUid] = useState(null);
  const toast = useToast();

  /** Handles sort action. */
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /** SortIcon React component. */
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort className="text-gray-300 dark:text-gray-600" size={10} />;
    return sortDir === 'asc' ? <FaSortUp className="text-blue-500" size={10} /> : <FaSortDown className="text-blue-500" size={10} />;
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q) ||
        formatRoleLabel(u.role).toLowerCase().includes(q)
      );
    }

    const sorted = [...result].sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'displayName':
          valA = (a.displayName || '').toLowerCase();
          valB = (b.displayName || '').toLowerCase();
          break;
        case 'email':
          valA = (a.email || '').toLowerCase();
          valB = (b.email || '').toLowerCase();
          break;
        case 'createdAt': {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.metadata?.creationTime ? new Date(a.metadata.creationTime) : new Date(0));
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.metadata?.creationTime ? new Date(b.metadata.creationTime) : new Date(0));
          valA = dateA.getTime();
          valB = dateB.getTime();
          break;
        }
        case 'lastSeen': {
          valA = a.streak?.lastLoginDate ? new Date(a.streak.lastLoginDate).getTime() : 0;
          valB = b.streak?.lastLoginDate ? new Date(b.streak.lastLoginDate).getTime() : 0;
          break;
        }
        case 'role':
          valA = (a.role || 'user').toLowerCase();
          valB = (b.role || 'user').toLowerCase();
          break;
        case 'points':
          valA = a.points?.lifetime ?? a.points ?? 0;
          valB = b.points?.lifetime ?? b.points ?? 0;
          break;
        default:
          valA = '';
          valB = '';
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [users, search, sortField, sortDir]);

  const onlineCount = onlineUsers.size;
  const adminCount = users.filter(u => ['business_owner', 'admin'].includes((u.role || '').toLowerCase())).length;

  /** Handles update user action. */
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

  /** Handles suspend user action. */
  const handleSuspendUser = async (uid, action, reason) => {
    if (!user) { toast('error', 'Not authenticated'); return; }
    if (!uid) { toast('error', 'Unable to determine user id'); return; }
    try {
        setProcessingUid(uid);
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ uid, action, reason }),
        });
        const json = await res.json();
        if (!res.ok) { toast('error', json.error || json.message || 'Failed to update user status'); return; }
        toast('success', json.message || `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully.`);
    } catch (err) {
        console.error('Error suspending/unsuspending user:', err);
        toast('error', 'Error: ' + (err.message || 'Unknown error'));
    } finally {
        setProcessingUid(null);
    }
  };

  /** Handles delete user action. */
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

  if (!canManageTeam(userProfile?.role)) {
    return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Only Business Owner, Admin, and Operations roles can manage users.</p>;
  }

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span>{users.length} total users</span>
              <FaCircle className="text-gray-300 dark:text-gray-600" size={6} />
              <span className="flex items-center gap-1.5">
                <FaCircle className="text-green-400" size={8} /> {onlineCount} online
              </span>
              <FaCircle className="text-gray-300 dark:text-gray-600" size={6} />
              <span>{adminCount} admins</span>
            </p>
          </div>
          <Link href="/admin/roles" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <FaUserCog /> View role breakdown
          </Link>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('displayName')}>
                  <span className="flex items-center gap-1">User <SortIcon field="displayName" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('email')}>
                  <span className="flex items-center gap-1">Email <SortIcon field="email" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('createdAt')}>
                  <span className="flex items-center gap-1">Created At <SortIcon field="createdAt" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('lastSeen')}>
                  <span className="flex items-center gap-1">Last Seen <SortIcon field="lastSeen" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('role')}>
                  <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('points')}>
                  <span className="flex items-center gap-1">Points <SortIcon field="points" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
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
                      onRequestSuspend={handleSuspendUser}
                      isProcessing={processingUid === userKey}
                      isOnline={onlineUsers.has(userKey)}
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
