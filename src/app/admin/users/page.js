'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { listUsers } from '../../../lib/firebaseHelpers';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      const userList = await listUsers();
      setUsers(userList);
      setLoading(false);
    }
    loadUsers();
  }, []);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">User Management</h1>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10">
                          <img className="w-full h-full rounded-full" src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} alt="" />
                        </div>
                        <div className="ml-3">
                          <p className="text-gray-900 dark:text-white whitespace-no-wrap">
                            {user.displayName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                      <p className="text-gray-900 dark:text-white whitespace-no-wrap">{user.email}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                      <span className={`relative inline-block px-3 py-1 font-semibold leading-tight ${user.role === 'admin' ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
                        <span aria-hidden className={`absolute inset-0 ${user.role === 'admin' ? 'bg-green-200 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'} opacity-50 rounded-full`}></span>
                        <span className="relative">{user.role || 'user'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">Edit</button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 ml-4">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
