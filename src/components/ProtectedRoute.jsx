'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { FaExclamationTriangle } from 'react-icons/fa';
import Button from './ui/Button';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (adminOnly && userProfile?.role !== 'admin') {
      // Non-admin trying to access admin page
      // We don't redirect here; we let the render logic show the detailed access denied message.
    }

  }, [loading, user, userProfile, adminOnly, router]);

  if (loading || !user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
            <LoadingSpinner />
        </div>
    );
  }

  if (adminOnly && userProfile?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full">
                <FaExclamationTriangle className="text-5xl text-red-500 mb-4 mx-auto" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">You do not have the required admin privileges to view this page.</p>
                
                <div className="text-left mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Account Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Logged in as: <strong>{user.email}</strong></p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Account Role: <strong>{userProfile?.role || 'Not Set'}</strong></p>
                </div>

                <div className="text-left mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">How to Fix This</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Please log out and log back in with an administrator account.</p>
                </div>

                <Button onClick={() => router.push('/dashboard')} className="mt-6 w-full" variant="primary">Return to Dashboard</Button>
            </div>
        </div>
    );
  }

  return children;
}
