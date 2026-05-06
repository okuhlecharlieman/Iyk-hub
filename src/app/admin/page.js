'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Link from 'next/link';
import { FaUsers, FaClock, FaCheckCircle, FaExclamationTriangle, FaCrown, FaChartLine, FaCog, FaShieldAlt, FaTrophy, FaMoneyBillWave, FaRocket, FaBriefcase, FaBuilding, FaArrowRight } from 'react-icons/fa';
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
  const [stats, setStats] = useState({ users: 0, pending: 0, approved: 0, boostOrders: 0, challengeOrders: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userProfile?.role?.toLowerCase() !== 'admin') {
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

    const boostsUnsubscribe = onSnapshot(collection(db, 'creatorBoostOrders'),
      (snapshot) => setStats(prev => ({ ...prev, boostOrders: snapshot.size })),
      () => {}
    );

    const challengesUnsubscribe = onSnapshot(collection(db, 'sponsoredChallenges'),
      (snapshot) => setStats(prev => ({ ...prev, challengeOrders: snapshot.size })),
      () => {}
    );

    Promise.allSettled([
        new Promise(res => onSnapshot(collection(db, 'users'), res)),
        new Promise(res => onSnapshot(collection(db, 'opportunities'), res))
    ]).then(() => setLoading(false));

    return () => {
      usersUnsubscribe();
      oppsUnsubscribe();
      boostsUnsubscribe();
      challengesUnsubscribe();
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

          {/* Revenue Streams Quick Access */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <FaMoneyBillWave className="mr-3 text-green-600" />
              Revenue Streams
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/payments" className="group bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-green-100 dark:bg-green-800 rounded-full p-2.5">
                    <FaRocket className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <FaArrowRight className="text-green-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Creator Boosts</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">R20 – R150 per boost</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">{stats.boostOrders} orders</p>
              </Link>

              <Link href="/sponsored-challenges" className="group bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-5 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-purple-100 dark:bg-purple-800 rounded-full p-2.5">
                    <FaTrophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <FaArrowRight className="text-purple-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Sponsored Challenges</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">20% platform fee</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">{stats.challengeOrders} challenges</p>
              </Link>

              <Link href="/admin/opportunities" className="group bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-blue-100 dark:bg-blue-800 rounded-full p-2.5">
                    <FaBriefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <FaArrowRight className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Sponsored Opps</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">R50 – R300 per listing</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">{stats.approved} approved</p>
              </Link>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-amber-100 dark:bg-amber-800 rounded-full p-2.5">
                    <FaBuilding className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Institution Plans</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">R199 – R999/month</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">Subscription revenue</p>
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