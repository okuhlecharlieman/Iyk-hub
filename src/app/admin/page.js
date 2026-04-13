'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Link from 'next/link';
import { FaUsers, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import StatCard from '../../components/admin/StatCard';
import UserManagementCard from '../../components/admin/UserManagementCard';
import PendingOppsCard from '../../components/admin/PendingOppsCard';
import LeaderboardCard from '../../components/admin/LeaderboardCard';
import AuditLogCard from '../../components/admin/AuditLogCard';
import PaymentsCard from '../../components/admin/PaymentsCard';
import SponsoredChallengesCard from '../../components/admin/SponsoredChallengesCard';

export default function AdminPage() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, pending: 0, approved: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      if (user) setLoading(false);
      return;
    }

    setLoading(true);

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), 
      (snapshot) => setStats(prev => ({ ...prev, users: snapshot.size })), 
      (err) => {
        console.error("Error fetching user stats:", err);
        setError("Could not load user statistics.");
      }
    );

    const oppsUnsubscribe = onSnapshot(collection(db, 'opportunities'), 
      (snapshot) => {
        let pending = 0, approved = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'pending') pending++;
          if (data.status === 'approved') approved++;
        });
        setStats(prev => ({ ...prev, pending, approved }));
      },
      (err) => {
        console.error("Error fetching opportunity stats:", err);
        setError("Could not load opportunity statistics.");
      }
    );

    Promise.allSettled([
        new Promise(res => onSnapshot(collection(db, 'users'), res)),
        new Promise(res => onSnapshot(collection(db, 'opportunities'), res))
    ]).then(() => setLoading(false));

    return () => {
      usersUnsubscribe();
      oppsUnsubscribe();
    };
  }, [user, userProfile]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <FaExclamationTriangle className="text-5xl text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">An Error Occurred</h2>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <p className="mt-4">Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="flex flex-col space-y-8">

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={<FaUsers />} title="Total Users" value={stats.users} color="blue" />
          <StatCard icon={<FaClock />} title="Pending Opportunities" value={stats.pending} color="yellow" />
          <StatCard icon={<FaCheckCircle />} title="Approved Opportunities" value={stats.approved} color="green" />
        </div>

        {/* Main Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <UserManagementCard />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <SponsoredChallengesCard />
            <PendingOppsCard />
            <AuditLogCard />
            <PaymentsCard />
          </div>
        </div>
        
        {/* Full-width Bottom Section */}
        <div>
          <LeaderboardCard />
        </div>

      </div>
    </ProtectedRoute>
  );
}