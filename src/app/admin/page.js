'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Link from 'next/link';
import { FaUsers, FaClock, FaCheckCircle, FaExclamationTriangle, FaCrown, FaChartLine, FaCog, FaShieldAlt, FaTrophy } from 'react-icons/fa';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import StatCard from '../../components/admin/StatCard';
import UserManagementCard from '../../components/admin/UserManagementCard';
import PendingOppsCard from '../../components/admin/PendingOppsCard';
import LeaderboardCard from '../../components/admin/LeaderboardCard';
import AuditLogCard from '../../components/admin/AuditLogCard';
import PaymentsCard from '../../components/admin/PaymentsCard';
import SponsoredChallengesCard from '../../components/admin/SponsoredChallengesCard';
import MonetizationDashboard from '../../components/admin/MonetizationDashboard';

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
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md">
          <FaExclamationTriangle className="text-5xl text-red-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">An Error Occurred</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                  <FaCrown className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Admin Dashboard</h1>
                  <p className="text-blue-100 mt-1">Manage your platform and monitor performance</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-2">
                  <FaShieldAlt className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Admin Access</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <FaChartLine className="mr-3 text-blue-600" />
              Platform Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3 mr-4">
                    <FaUsers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-3 mr-4">
                    <FaClock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Opportunities</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full p-3 mr-4">
                    <FaCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved Opportunities</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3 mr-4">
                    <FaCog className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</p>
                    <p className="text-lg font-bold text-green-600">Healthy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

            {/* Left Column - Primary Management */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <FaUsers className="mr-3 text-blue-600" />
                  User Management
                </h3>
                <UserManagementCard />
              </div>
            </div>

            {/* Right Column - Quick Actions & Monitoring */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <FaClock className="mr-3 text-yellow-600" />
                  Pending Reviews
                </h3>
                <PendingOppsCard />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <FaCrown className="mr-3 text-purple-600" />
                  Sponsored Challenges
                </h3>
                <SponsoredChallengesCard />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <FaChartLine className="mr-3 text-green-600" />
                  Payments
                </h3>
                <PaymentsCard />
              </div>
            </div>
          </div>

          {/* Monetization Dashboard - Full Width */}
          <div className="mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <FaChartLine className="mr-3 text-blue-600" />
                Revenue Analytics
              </h3>
              <MonetizationDashboard />
            </div>
          </div>

          {/* Additional Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <FaTrophy className="mr-3 text-yellow-600" />
                Leaderboard Management
              </h3>
              <LeaderboardCard />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <FaShieldAlt className="mr-3 text-red-600" />
                Audit Logs
              </h3>
              <AuditLogCard />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}