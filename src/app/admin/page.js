'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">This feature is temporarily unavailable while we resolve a system issue. Please check back later.</p>
          </div>
          {loading && <LoadingSpinner />}
        </div>
      </div>
    </ProtectedRoute>
  );
}
