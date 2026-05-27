'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Link from 'next/link';
import { FaUsers, FaClock, FaCheckCircle, FaExclamationTriangle, FaCrown, FaChartLine, FaShieldAlt, FaTrophy, FaMoneyBillWave, FaRocket, FaBriefcase, FaBuilding, FaArrowRight, FaSyncAlt } from 'react-icons/fa';


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

    async function fetchStats() {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setError('Could not load dashboard statistics.');
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Could not load dashboard statistics.');
      }
      setLoading(false);
    }

    fetchStats();
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-md">
          <FaExclamationTriangle className="text-4xl text-red-500 mb-4 mx-auto" />
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <FaSyncAlt className="inline mr-2" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: <FaUsers />, color: 'blue', href: '/admin/users' },
    { label: 'Pending Opps', value: stats.pending, icon: <FaClock />, color: 'amber', href: '/admin/opportunities' },
    { label: 'Approved Opps', value: stats.approved, icon: <FaCheckCircle />, color: 'green', href: '/admin/opportunities' },
    { label: 'Boost Orders', value: stats.boostOrders, icon: <FaRocket />, color: 'purple', href: '/admin/payments' },
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/40' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
  };

  const revenueCards = [
    { href: '/admin/opportunities', icon: <FaBriefcase />, title: 'Sponsored Opps', desc: 'R50 – R300/listing', stat: `${stats.approved} approved`, gradient: 'from-blue-500 to-cyan-600' },
    { href: '/admin/InstitutionPlans', icon: <FaBuilding />, title: 'Institution Plans', desc: 'R199 – R999/month', stat: 'Subscription', gradient: 'from-amber-500 to-orange-600' },
    { href: '/admin/boost-management', icon: <FaRocket />, title: 'Creator Boosts', desc: 'R20 – R150/boost', stat: `${stats.boostOrders} orders`, gradient: 'from-green-500 to-emerald-600' },
    { href: '/admin/sponsored-challenges', icon: <FaTrophy />, title: 'Challenges', desc: '20% platform fee', stat: `${stats.challengeOrders} challenges`, gradient: 'from-purple-500 to-indigo-600' },
  ];

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform overview and management</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              System Healthy
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card) => {
            const colors = colorMap[card.color];
            return (
              <Link key={card.label} href={card.href} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 hover:shadow-md transition-all hover:border-gray-300 dark:hover:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div className={`${colors.iconBg} rounded-lg p-2`}>
                    <span className={`${colors.icon} text-lg`}>{card.icon}</span>
                  </div>
                  <FaArrowRight className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all text-xs" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
              </Link>
            );
          })}
        </div>

        {/* Revenue Streams */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FaMoneyBillWave className="text-green-500" /> Revenue Streams
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {revenueCards.map((card) => (
              <Link key={card.title} href={card.href} className="group relative overflow-hidden rounded-xl p-4 text-white hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`}></div>
                <div className="relative">
                  <span className="text-2xl opacity-80">{card.icon}</span>
                  <h4 className="font-bold mt-2">{card.title}</h4>
                  <p className="text-sm opacity-80 mt-0.5">{card.desc}</p>
                  <p className="text-xs font-medium mt-2 bg-white/20 rounded-full px-2 py-0.5 inline-block">{card.stat}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaClock className="text-amber-500" /> Pending Reviews
              </h3>
              <PendingOppsCard />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaChartLine className="text-blue-500" /> Revenue Analytics
              </h3>
              <MonetizationDashboard />
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaUsers className="text-blue-500" /> User Management
              </h3>
              <UserManagementCard />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaCrown className="text-purple-500" /> Challenges
              </h3>
              <SponsoredChallengesCard />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaChartLine className="text-green-500" /> Payments
              </h3>
              <PaymentsCard />
            </section>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaTrophy className="text-yellow-500" /> Leaderboard
            </h3>
            <LeaderboardCard />
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-red-500" /> Audit Logs
            </h3>
            <AuditLogCard />
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
