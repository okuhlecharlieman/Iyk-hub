'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { listAllOpportunities, updateOpportunityStatus } from '../../../lib/firebaseHelpers';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Link from 'next/link';
import { FaCheck, FaTimes, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';

export default function ManageOpportunities() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [opps, setOpps] = useState([]);
    const [filter, setFilter] = useState('pending'); // ‘pending’, ‘approved’, ‘rejected’

    const loadOpps = async () => {
        setLoading(true);
        try {
            const allOpps = await listAllOpportunities();
            setOpps(allOpps);
        } catch (error) {
            console.error("Error loading opportunities:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            loadOpps();
        }
    }, [user]);

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateOpportunityStatus(id, status);
            await loadOpps(); // Refresh list
        } catch (error) {
            console.error(`Error updating opportunity ${id} to ${status}:`, error);
            alert(`Failed to update opportunity. See console for details.`);
        }
    };
    
    const filteredOpps = opps.filter(o => o.status === filter);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>;
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Manage Opportunities</h1>
                        <Link href="/admin" className="text-blue-600 dark:text-blue-400 hover:underline">← Back to Admin Dashboard</Link>
                    </div>

                    <div className="flex justify-center mb-6 border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setFilter('pending')} className={`tab-button ${filter === 'pending' ? 'active' : ''}`}>Pending</button>
                        <button onClick={() => setFilter('approved')} className={`tab-button ${filter === 'approved' ? 'active' : ''}`}>Approved</button>
                        <button onClick={() => setFilter('rejected')} className={`tab-button ${filter === 'rejected' ? 'active' : ''}`}>Rejected</button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        {filteredOpps.length > 0 ? (
                            <div className="space-y-4">
                                {filteredOpps.map(opp => (
                                    <div key={opp.id} className="p-4 border rounded-lg dark:border-gray-700 flex flex-col md:flex-row justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg">{opp.title}</h3>
                                            <p className="text-sm text-gray-500">{opp.org}</p>
                                            <p className="text-sm mt-2">{opp.description}</p>
                                            <a href={opp.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1">Visit Link <FaExternalLinkAlt /></a>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-4 md:mt-0">
                                            {filter === 'pending' && (
                                                <>
                                                    <button onClick={() => handleStatusUpdate(opp.id, 'approved')} className="btn-primary"><FaCheck /></button>
                                                    <button onClick={() => handleStatusUpdate(opp.id, 'rejected')} className="btn-secondary"><FaTimes /></button>
                                                </>
                                            )}
                                            {filter !== 'pending' && (
                                                <button onClick={() => handleStatusUpdate(opp.id, 'pending')} className="btn-secondary">Reset to Pending</button>
                                            )}
                                            {/* Could add a permanent delete option for rejected opps */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No opportunities in this category.</p>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
