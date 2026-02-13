'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { FaShieldAlt, FaUser, FaEnvelope, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

// THIS IS THE FIX. It tells Next.js not to pre-render this page at build time.
export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
    const { user, userProfile } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (userProfile?.isAdmin) {
            fetch('/api/list-users')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setUsers(data.users);
                    } else {
                        setError(data.error || 'Failed to fetch users.');
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching users:", err);
                    setError('An unexpected error occurred.');
                    setLoading(false);
                });
        }
    }, [userProfile]);

    if (!userProfile) {
        return (
            <ProtectedRoute adminOnly={true}>
                <div className="min-h-screen flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute adminOnly={true}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">User Management</h1>
                    {loading && <LoadingSpinner />}
                    {error && <p className="text-red-500 bg-red-100 dark:bg-red-900 p-4 rounded-lg">Error: {error}</p>}
                    {!loading && !error && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <img className="h-10 w-10 rounded-full" src={u.photoURL || `https://avatar.vercel.sh/${u.id}.png`} alt="" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{u.displayName || 'No Name'}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FaEnvelope /> {u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                        {u.isAdmin ? <FaShieldAlt className="mr-1"/> : <FaUser className="mr-1"/>} {u.isAdmin ? 'Admin' : 'User'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-1"><FaClock /> {new Date(u.createdAt?._seconds * 1000).toLocaleDateString()}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
