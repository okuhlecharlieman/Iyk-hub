'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Link from 'next/link';
import { FaCheck, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import { auth } from '../../../lib/firebase';
import { updateOpportunity as clientUpdateOpportunity, approveOpportunity as clientApproveOpportunity, rejectOpportunity as clientRejectOpportunity } from '../../../lib/firebase/helpers';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import Skeleton from '../../../components/ui/Skeleton';

export default function ManageOpportunities() {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [opps, setOpps] = useState([]);
    const [filter, setFilter] = useState('pending'); // ‘pending’, ‘approved’, ‘rejected'
    const toast = useToast();

    useEffect(() => {
        // Only load admin-owned data when we have BOTH a signed-in user and
        // a Firestore profile that marks them admin. This prevents calling the
        // admin API without an ID token (causing 401s).
        if (user && userProfile?.isAdmin) {
            loadOpps();
        } else if (user) {
            setLoading(false);
        }
    }, [user, userProfile]);

    const loadOpps = async () => {
        setLoading(true);
        try {
            const firebaseUser = user || auth.currentUser;
            if (!firebaseUser) {
              toast('error', 'You must be signed in to manage opportunities');
              setOpps([]);
              setLoading(false);
              return;
            }

            const idToken = await firebaseUser.getIdToken(true);
            const res = await fetch('/api/admin/opportunities', { headers: { Authorization: `Bearer ${idToken}` } });
            const body = await res.json();
            if (!res.ok) {
              toast('error', body.error || 'Failed to load opportunities');
              setOpps([]);
            } else if (!Array.isArray(body)) {
              console.warn('/api/admin/opportunities returned non-array', body);
              setOpps([]);
            } else {
              setOpps(body);
            }
        } catch (error) {
            console.error("Error loading opportunities:", error);
            toast('error', 'Error loading opportunities');
            setOpps([]);
        }
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const firebaseUser = user || auth.currentUser;
            if (!firebaseUser) {
              toast('error', 'You must be signed in to perform this action');
              return;
            }

            const idToken = await firebaseUser.getIdToken(true);
            const res = await fetch('/api/admin/opportunities', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ id, status }),
            });

            const json = await res.json();
            if (!res.ok) {
              // If server-side admin API is unavailable or unauthorized, fall back
              // to client-side Firestore update (relies on Firestore security rules).
              toast('error', json.error || json.message || 'Failed to update opportunity via admin API — trying client fallback');

              try {
                if (status === 'approved') {
                  await clientApproveOpportunity(id);
                } else if (status === 'rejected') {
                  await clientRejectOpportunity(id);
                } else {
                  await clientUpdateOpportunity(id, { status });
                }
                await loadOpps();
                toast('success', `Updated "${json.title || id}" to ${status} (client fallback)`);
                return;
              } catch (fallbackErr) {
                console.error('Client-side fallback failed:', fallbackErr);
                toast('error', 'Both admin API and client fallback failed');
                return;
              }
            }

            await loadOpps(); // Refresh the list after updating
            toast('success', `Updated "${json.title || id}" to ${status}`);
        } catch (error) {
            console.error(`Error updating opportunity ${id} to ${status}:`, error);
            toast('error', `Failed to update opportunity`);
        }
    };
    
    const filteredOpps = opps.filter(o => o.status === filter);

    return (
        <ProtectedRoute adminOnly={true}>
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

                    {loading ? (
                        <div className="container mx-auto px-4 py-8"><Skeleton count={3} variant="card" /></div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                            {filteredOpps.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredOpps.map(opp => (
                                        <div key={opp.id} className="p-4 border rounded-lg dark:border-gray-700 flex flex-col md:flex-.row justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg">{opp.title}</h3>
                                                <p className="text-sm text-gray-500">{opp.org}</p>
                                                <p className="text-sm mt-2">{opp.description}</p>
                                                <a href={opp.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1">Visit Link <FaExternalLinkAlt /></a>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-4 md:mt-0">
                                                {filter === 'pending' && (
                                                    <>
                                                        <Button size="sm" variant="primary" ariaLabel={`Approve ${opp.title}`} onClick={() => handleStatusUpdate(opp.id, 'approved')}><FaCheck /></Button>
                                                        <Button size="sm" variant="danger" ariaLabel={`Reject ${opp.title}`} onClick={() => handleStatusUpdate(opp.id, 'rejected')}><FaTimes /></Button>
                                                    </>
                                                )}
                                                {filter !== 'pending' && (
                                                    <Button size="sm" variant="secondary" ariaLabel={`Reset ${opp.title} to pending`} onClick={() => handleStatusUpdate(opp.id, 'pending')}>Reset to Pending</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No opportunities in this category.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
