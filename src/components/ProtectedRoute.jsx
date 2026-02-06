'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (adminOnly && !userProfile?.isAdmin) {
      // Non-admin trying to access admin page
      // Redirect or show an access denied message
      // For now, redirecting to dashboard
      router.replace('/dashboard');
    }

  }, [loading, user, userProfile, adminOnly, router]);

  if (loading || !user || (adminOnly && !userProfile?.isAdmin)) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
            { (adminOnly && user && !userProfile?.isAdmin) ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md">
                    <FaExclamationTriangle className="text-5xl text-red-500 mb-4 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">You do not have permission to view this page.</p>
                    <button onClick={() => router.push('/dashboard')} className="mt-6 btn-primary">Return to Dashboard</button>
                </div>
            ) : (
                <LoadingSpinner />
            )}
        </div>
    );
  }

  return children;
}
