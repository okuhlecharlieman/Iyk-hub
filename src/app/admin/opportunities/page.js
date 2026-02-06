'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { listPendingOpportunities, approveOpportunity, rejectOpportunity } from '../../../lib/firebaseHelpers';
import OpportunityCard from '../../../components/OpportunityCard';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function AdminOpportunitiesPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const p = await listPendingOpportunities();
      setPending(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const handleApprove = async (id) => { await approveOpportunity(id); await load(); };
  const handleReject = async (id) => { await rejectOpportunity(id); await load(); };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">Pending Opportunities</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Review and approve or reject submissions.</p>
          </div>

          {loading ? <div className="flex justify-center"><LoadingSpinner /></div> :
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pending.length > 0 ? pending.map((o) => (
                <OpportunityCard 
                  key={o.id} 
                  opportunity={o} 
                  isAdmin={true} 
                  user={user}
                  onApprove={handleApprove} 
                  onReject={handleReject}
                />
              )) : <p className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">No pending opportunities to review.</p>}
            </div>
          }
        </div>
      </div>
    </ProtectedRoute>
  );
}
