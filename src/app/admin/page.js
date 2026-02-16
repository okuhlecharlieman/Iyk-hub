'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Link from 'next/link';
import { FaUsers, FaClock, FaCheckCircle } from 'react-icons/fa';
import { db as firestore } from '../../lib/firebase'; // Use client-side firebase
import { collection, onSnapshot } from 'firebase/firestore';

export default function AdminPage() {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ users: 0, pending: 0, approved: 0 });

    useEffect(() => {
        if (userProfile?.role !== 'admin') {
            if (user) setLoading(false);
            return;
        }

        setLoading(true);

        // Real-time listener for users
        const usersUnsubscribe = onSnapshot(collection(firestore, 'users'), (snapshot) => {
            setStats(prevStats => ({ ...prevStats, users: snapshot.size }));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user stats:", error);
            setLoading(false);
        });

        // Real-time listener for opportunities
        const oppsUnsubscribe = onSnapshot(collection(firestore, 'opportunities'), (snapshot) => {
            let pending = 0;
            let approved = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'pending') pending++;
                if (data.status === 'approved') approved++;
            });
            setStats(prevStats => ({ ...prevStats, pending, approved }));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching opportunity stats:", error);
            setLoading(false);
        });

        // Cleanup listeners on component unmount
        return () => {
            usersUnsubscribe();
            oppsUnsubscribe();
        };

    }, [user, userProfile]);

    return (
        <ProtectedRoute adminOnly={true}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Admin Dashboard</h1>
                        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Overview of the community hub.</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="stat-card"><FaUsers className="text-3xl text-blue-500" /><div><p className="text-gray-500">Total Users</p><p className="text-2xl font-bold">{stats.users}</p></div></div>
                                <div className="stat-card"><FaClock className="text-3xl text-yellow-500" /><div><p className="text-gray-500">Pending Opportunities</p><p className="text-2xl font-bold">{stats.pending}</p></div></div>
                                <div className="stat-card"><FaCheckCircle className="text-3xl text-green-500" /><div><p className="text-gray-500">Approved Opportunities</p><p className="text-2xl font-bold">{stats.approved}</p></div></div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold mb-4">Management</h2>
                                <div className="flex flex-col space-y-4">
                                    <Link href="/admin/opportunities" className="btn-secondary">Manage Opportunities</Link>
                                    <Link href="/admin/users" className="btn-secondary">Manage Users</Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
