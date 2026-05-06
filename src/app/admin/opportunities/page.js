'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Link from 'next/link';
import { FaCheck, FaTimes, FaExternalLinkAlt, FaTrash, FaSync } from 'react-icons/fa';
import { auth } from '../../../lib/firebase';
import { updateOpportunity as clientUpdateOpportunity, approveOpportunity as clientApproveOpportunity, rejectOpportunity as clientRejectOpportunity, deleteOpportunity } from '../../../lib/firebase/helpers';
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
        if (user && userProfile?.role?.toLowerCase() === 'admin') {
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
              if (toast) toast('error', 'You must be signed in to manage opportunities');
              setOpps([]);
              setLoading(false);
              return;
            }

            const idToken = await firebaseUser.getIdToken(true);
            const res = await fetch('/api/admin/opportunities', { headers: { Authorization: `Bearer ${idToken}` } });
            const body = await res.json();
            if (!res.ok) {
              if (toast) toast('error', body.error || 'Failed to load opportunities');
              setOpps([]);
            } else if (!Array.isArray(body)) {
              console.warn('/api/admin/opportunities returned non-array', body);
              setOpps([]);
            } else {
              setOpps(body);
            }
        } catch (error) {
            console.error("Error loading opportunities:", error);
            if (toast) toast('error', 'Error loading opportunities');
            setOpps([]);
        }
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const firebaseUser = user || auth.currentUser;
            if (!firebaseUser) {
              if (toast) toast('error', 'You must be signed in to perform this action');
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
              if (toast) toast('error', json.error || json.message || 'Failed to update opportunity via admin API — trying client fallback');

              try {
                if (status === 'approved') {
                  await clientApproveOpportunity(id);
                } else if (status === 'rejected') {
                  await clientRejectOpportunity(id);
                } else {
                  await clientUpdateOpportunity(id, { status });
                }
                await loadOpps();
                if (toast) toast('success', `Updated "${json.title || id}" to ${status} (client fallback)`);
                return;
              } catch (fallbackErr) {
                console.error('Client-side fallback failed:', fallbackErr);
                if (toast) toast('error', 'Both admin API and client fallback failed');
                return;
              }
            }

            await loadOpps(); // Refresh the list after updating
            if (toast) toast('success', `Updated "${json.title || id}" to ${status}`);
        } catch (error) {
            console.error(`Error updating opportunity ${id} to ${status}:`, error);
            if (toast) toast('error', `Failed to update opportunity`);
        }
    };
    
    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteOpportunity(id);
            toast('success', `Deleted "${title}"`);
            await loadOpps();
        } catch (err) {
            toast('error', 'Failed to delete: ' + (err.message || 'Unknown error'));
        }
    };

    const filteredOpps = opps.filter(o => o.status === filter);
    const pendingCount = opps.filter(o => o.status === 'pending').length;
    const approvedCount = opps.filter(o => o.status === 'approved').length;
    const rejectedCount = opps.filter(o => o.status === 'rejected').length;

    return (
        <ProtectedRoute adminOnly={true}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Manage Opportunities</h1>
                        <Link href="/admin" className="text-blue-600 dark:text-blue-400 hover:underline">← Back to Admin Dashboard</Link>
                    </div> 

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex gap-2">
                        {[{ key: 'pending', label: 'Pending', count: pendingCount, color: 'amber' }, { key: 'approved', label: 'Approved', count: approvedCount, color: 'green' }, { key: 'rejected', label: 'Rejected', count: rejectedCount, color: 'red' }].map(tab => (
                          <button key={tab.key} onClick={() => setFilter(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            filter === tab.key
                              ? `bg-${tab.color}-100 text-${tab.color}-700 dark:bg-${tab.color}-900/30 dark:text-${tab.color}-400`
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}>
                            {tab.label}
                            <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                              filter === tab.key ? `bg-${tab.color}-200 dark:bg-${tab.color}-800` : 'bg-gray-200 dark:bg-gray-600'
                            }`}>{tab.count}</span>
                          </button>
                        ))}
                      </div>
                      <Button size="sm" variant="secondary" onClick={loadOpps} disabled={loading}>
                        <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
                      </Button>
                    </div>

                    {loading ? (
                        <div className="container mx-auto px-4 py-8"><Skeleton count={3} variant="card" /></div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                            {filteredOpps.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredOpps.map(opp => (
                                        <div key={opp.id} className="p-4 border rounded-lg dark:border-gray-700 hover:shadow-sm transition-shadow">
                                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{opp.title}</h3>
                                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    opp.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : opp.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                  }`}>{opp.status}</span>
                                                </div>
                                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{opp.org}</p>
                                                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">{opp.description}</p>
                                                {opp.link && <a href={opp.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1 mt-2"><FaExternalLinkAlt size={10} /> Visit Link</a>}
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                {filter === 'pending' && (
                                                    <>
                                                        <Button size="sm" variant="primary" ariaLabel={`Approve ${opp.title}`} onClick={() => handleStatusUpdate(opp.id, 'approved')}><FaCheck className="mr-1" /> Approve</Button>
                                                        <Button size="sm" variant="danger" ariaLabel={`Reject ${opp.title}`} onClick={() => handleStatusUpdate(opp.id, 'rejected')}><FaTimes className="mr-1" /> Reject</Button>
                                                    </>
                                                )}
                                                {filter !== 'pending' && (
                                                    <Button size="sm" variant="secondary" ariaLabel={`Reset ${opp.title} to pending`} onClick={() => handleStatusUpdate(opp.id, 'pending')}>Reset</Button>
                                                )}
                                                <Button size="sm" variant="danger" ariaLabel={`Delete ${opp.title}`} onClick={() => handleDelete(opp.id, opp.title)}><FaTrash /></Button>
                                              </div>
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
