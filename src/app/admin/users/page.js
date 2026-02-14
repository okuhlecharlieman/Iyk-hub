'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers } from '../../../lib/helpers';
import LoadingSpinner from '../../../components/LoadingSpinner';

const UserRow = ({ user, onSetRole }) => {
  const [loading, setLoading] = useState(false);
  const { user: authUser } = useAuth();

  const handleSetRole = async (role) => {
    setLoading(true);
    if (!authUser) {
      console.error("Not authenticated");
      setLoading(false);
      return;
    }
    try {
      const idToken = await authUser.getIdToken();
      const response = await fetch('/api/set-user-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: user.uid, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set user role');
      }
      
      onSetRole(user.uid, role);
    } catch (error) {
      console.error('Error setting user role:', error);
    }
    setLoading(false);
  };

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.displayName}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.customClaims?.role || 'user'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {user.customClaims?.role === 'admin' ? (
          <button onClick={() => handleSetRole('user')} className="text-red-600 hover:text-red-900" disabled={loading}>
            {loading ? '...' : 'Remove Admin'}
          </button>
        ) : (
          <button onClick={() => handleSetRole('admin')} className="text-indigo-600 hover:text-indigo-900" disabled={loading}>
            {loading ? '...' : 'Make Admin'}
          </button>
        )}
      </td>
    </tr>
  );
};

export default function UserManagementPage() {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const loadUsers = async () => {
        setLoading(true);
        try {
          const allUsers = await listAllUsers();
          setUsers(allUsers);
        } catch (error) {
          console.error('Error loading users:', error);
        }
        setLoading(false);
      };
      loadUsers();
    }
  }, [user, userProfile]);

  const handleRoleChange = (uid, role) => {
    setUsers(users.map(u => u.uid === uid ? { ...u, customClaims: { role } } : u));
  };

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-8">User Management</h1>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map(user => (
                    <UserRow key={user.uid} user={user} onSetRole={handleRoleChange} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
