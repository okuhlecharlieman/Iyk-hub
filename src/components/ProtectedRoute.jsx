'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(()=>{
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner />
    </div>
  );

  if (!user) return null;
  return children;
}