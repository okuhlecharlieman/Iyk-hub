'use client';
/**
 * Page component for /admin/sponsored-challenges.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { FaCheck, FaTimes, FaExternalLinkAlt, FaSyncAlt, FaTrophy } from 'react-icons/fa';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const TAB_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** ManageSponsoredChallenges React component. */
export default function ManageSponsoredChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!user) return;
    loadChallenges();
  }, [user]);

  /** Fetches/retrieves data — loadChallenges. */
  const loadChallenges = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/sponsored-challenges', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load challenges');
      }
      setChallenges(Array.isArray(json.challenges) ? json.challenges : []);
    } catch (error) {
      console.error('Error loading sponsored challenges:', error);
      toast('error', error.message || 'Failed to load challenges');
      setChallenges([]);
    }
    setLoading(false);
  };

  /** Handles status change action. */
  const handleStatusChange = async (id, status) => {
    setProcessingId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/sponsored-challenges/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update status');
      }
      toast('success', `Challenge marked ${status}`);
      await loadChallenges();
    } catch (error) {
      console.error('Error updating challenge status:', error);
      toast('error', error.message || 'Status update failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredChallenges = challenges.filter((challenge) => challenge.status === filter);
  const counts = {
    pending: challenges.filter((c) => c.status === 'pending').length,
    approved: challenges.filter((c) => c.status === 'approved').length,
    rejected: challenges.filter((c) => c.status === 'rejected').length,
  };

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300 uppercase tracking-[0.24em] font-semibold">Admin</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Manage Sponsored Challenges</h1>
              <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">Review, approve, and manage challenges submitted by your sponsors and companies.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/sponsored-challenges/create" className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition">
                Create new challenge
              </Link>
              <Button onClick={loadChallenges} size="sm" variant="secondary" disabled={loading}>
                <FaSyncAlt className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(TAB_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                >
                  {label} <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white text-xs font-bold text-blue-600 dark:bg-gray-900 dark:text-blue-200">{counts[key] || 0}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="h-28 rounded-3xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
                ))}
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
                No {TAB_LABELS[filter].toLowerCase()} challenges found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChallenges.map((challenge) => (
                  <div key={challenge.id} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[challenge.status]}`}>
                            {challenge.status}
                          </span>
                          <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{challenge.challengeType || 'General'}</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{challenge.title}</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{challenge.description}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-gray-600 dark:text-gray-400">
                          <div><strong className="text-gray-900 dark:text-white">Sponsor</strong><br />{challenge.sponsorName}</div>
                          <div><strong className="text-gray-900 dark:text-white">Budget</strong><br />R{((challenge.budgetCents || 0) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                          <div><strong className="text-gray-900 dark:text-white">Deadline</strong><br />{challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : '—'}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 items-stretch sm:items-end">
                        <Link href={`/sponsored-challenges/${challenge.id}`} className="inline-flex items-center justify-center rounded-full border border-transparent bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          <FaExternalLinkAlt className="mr-2" /> View
                        </Link>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          {challenge.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleStatusChange(challenge.id, 'approved')}
                              disabled={processingId === challenge.id}
                            >
                              <FaCheck /> Approve
                            </Button>
                          )}
                          {challenge.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleStatusChange(challenge.id, 'rejected')}
                              disabled={processingId === challenge.id}
                            >
                              <FaTimes /> Reject
                            </Button>
                          )}
                          {challenge.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStatusChange(challenge.id, 'pending')}
                              disabled={processingId === challenge.id}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
