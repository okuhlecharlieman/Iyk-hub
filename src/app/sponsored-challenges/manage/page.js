'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { FaExternalLinkAlt, FaTrash, FaPlus, FaSpinner } from 'react-icons/fa';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function ManageUserSponsoredChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'sponsoredChallenges'),
      where('creatorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setChallenges(items);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load user challenges:', error);
        toast('error', 'Could not load your challenges');
        setChallenges([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const handleDelete = async (challenge) => {
    if (!window.confirm(`Delete challenge "${challenge.title}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(challenge.id);
    try {
      await deleteDoc(doc(db, 'sponsoredChallenges', challenge.id));
      toast('success', 'Challenge deleted successfully');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast('error', 'Could not delete challenge');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300 uppercase tracking-[0.24em] font-semibold">Your account</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Manage Your Sponsored Challenges</h1>
              <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">View your submitted challenges, see their status, and manage them after creation.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/sponsored-challenges/create" className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-5 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition">
                <FaPlus className="mr-2" /> New Challenge
              </Link>
              <Link href="/sponsored-challenges" className="inline-flex items-center justify-center rounded-full border border-transparent bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition">
                Browse Challenges
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 sm:p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
                ))}
              </div>
            ) : challenges.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">No challenges created yet.</p>
                <p className="mt-3">Create a new sponsored challenge to reach your target participants.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {challenges.map((challenge) => (
                  <div key={challenge.id} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[challenge.status] || STATUS_STYLES.pending}`}>
                            {challenge.status}
                          </span>
                          <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{challenge.challengeType || 'General'}</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{challenge.title}</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{challenge.description}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-gray-600 dark:text-gray-400">
                          <div><strong className="text-gray-900 dark:text-white">Budget</strong><br />R{((challenge.budgetCents || 0) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                          <div><strong className="text-gray-900 dark:text-white">Deadline</strong><br />{challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : '—'}</div>
                          <div><strong className="text-gray-900 dark:text-white">Created</strong><br />{challenge.createdAt ? new Date(challenge.createdAt).toLocaleDateString() : '—'}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 items-stretch sm:w-auto">
                        <Link href={`/sponsored-challenges/${challenge.id}`} className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          <FaExternalLinkAlt className="mr-2" /> View
                        </Link>
                        {(challenge.status === 'pending' || challenge.status === 'rejected') && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(challenge)}
                            disabled={deletingId === challenge.id}
                          >
                            {deletingId === challenge.id ? <FaSpinner className="animate-spin" /> : <><FaTrash className="mr-2" /> Delete</>}
                          </Button>
                        )}
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
