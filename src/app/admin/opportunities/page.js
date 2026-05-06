'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { FaCheck, FaTimes, FaExternalLinkAlt, FaTrash, FaSync, FaTasks } from 'react-icons/fa';
import { auth } from '../../../lib/firebase';
import { updateOpportunity as clientUpdateOpportunity, approveOpportunity as clientApproveOpportunity, rejectOpportunity as clientRejectOpportunity, deleteOpportunity } from '../../../lib/firebase/helpers';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import Skeleton from '../../../components/ui/Skeleton';

const TAB_STYLES = {
  pending: {
    active: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    badge: 'bg-amber-200 dark:bg-amber-800',
  },
  approved: {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    badge: 'bg-green-200 dark:bg-green-800',
  },
  rejected: {
    active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    badge: 'bg-red-200 dark:bg-red-800',
  },
};

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function ManageOpportunities() {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [opps, setOpps] = useState([]);
    const [filter, setFilter] = useState('pending');
    const toast = useToast();

    useEffect(() => {
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
            if (!firebaseUser) { toast('error', 'You must be signed in'); return; }

            const idToken = await firebaseUser.getIdToken(true);
            const res = await fetch('/api/admin/opportunities', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ id, status }),
            });

            const json = await res.json();
            if (!res.ok) {
              toast('error', json.error || 'Failed via API — trying fallback');
              try {
                if (status === 'approved') await clientApproveOpportunity(id);
                else if (status === 'rejected') await clientRejectOpportunity(id);
                else await clientUpdateOpportunity(id, { status });
                await loadOpps();
                toast('success', `Updated to ${status}`);
                return;
              } catch (fallbackErr) {
                toast('error', 'Both API and fallback failed');
                return;
              }
            }

            await loadOpps();
            toast('success', `Updated "${json.title || id}" to ${status}`);
        } catch (error) {
            console.error(`Error updating opportunity:`, error);
            toast('error', 'Failed to update opportunity');
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

    const tabs = [
      { key: 'pending', label: 'Pending', count: pendingCount },
      { key: 'approved', label: 'Approved', count: approvedCount },
      { key: 'rejected', label: 'Rejected', count: rejectedCount },
    ];

    return (
        <ProtectedRoute adminOnly={true}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Opportunities</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {opps.length} total · {pendingCount} pending review
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={loadOpps} disabled={loading}>
                    <FaSync className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                  {tabs.map(tab => {
                    const styles = TAB_STYLES[tab.key];
                    const isActive = filter === tab.key;
                    return (
                      <button key={tab.key} onClick={() => setFilter(tab.key)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive ? styles.active : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>
                        {tab.label}
                        <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 text-xs rounded-full px-1.5 ${
                          isActive ? styles.badge : 'bg-gray-200 dark:bg-gray-600'
                        }`}>{tab.count}</span>
                      </button>
                    );
                  })}
                </div>

                {loading ? (
                    <Skeleton count={3} variant="card" />
                ) : (
                    <div className="space-y-3">
                        {filteredOpps.length > 0 ? (
                            filteredOpps.map(opp => (
                                <div key={opp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 hover:shadow-sm transition-shadow">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                          <h3 className="font-bold text-gray-900 dark:text-white">{opp.title}</h3>
                                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_STYLES[opp.status] || STATUS_STYLES.pending}`}>
                                            {opp.status}
                                          </span>
                                        </div>
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{opp.org}</p>
                                        <p className="text-sm mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">{opp.description}</p>
                                        {opp.link && (
                                          <a href={opp.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1 mt-2">
                                            <FaExternalLinkAlt size={10} /> Visit Link
                                          </a>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {filter === 'pending' && (
                                            <>
                                                <Button size="sm" variant="primary" onClick={() => handleStatusUpdate(opp.id, 'approved')}>
                                                  <FaCheck className="mr-1" /> Approve
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleStatusUpdate(opp.id, 'rejected')}>
                                                  <FaTimes className="mr-1" /> Reject
                                                </Button>
                                            </>
                                        )}
                                        {filter !== 'pending' && (
                                            <Button size="sm" variant="secondary" onClick={() => handleStatusUpdate(opp.id, 'pending')}>Reset</Button>
                                        )}
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(opp.id, opp.title)}><FaTrash /></Button>
                                      </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                              <FaTasks className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                              <p className="text-gray-500 dark:text-gray-400 text-sm">No {filter} opportunities.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
