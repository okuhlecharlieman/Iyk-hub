/**
 * Opportunity Board — users submit, browse, and manage opportunities.
 * Admins can approve/reject. Users can optionally sponsor (pin) an
 * opportunity by paying R50 via Paystack after submission.
 *
 * Analytics: Each OpportunityCard tracks views (on mount) and clicks
 * (on link open) via /api/opportunities/analytics. Admin dashboard at
 * /admin/opportunity-analytics shows aggregate stats.
 *
 * Sponsored opportunities get a 'sponsoredOpportunity' type and yellow border.
 */
'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  approveOpportunity,
  rejectOpportunity,
  listOpportunitiesPage,
} from '../../lib/firebase/helpers';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';
import { ErrorAlert, ErrorEmptyState, EmptyState } from '../../components/alerts/Alerts';
import { SkeletonCards } from '../../components/loaders/SkeletonLoader';
import OpportunityCard from '../../components/OpportunityCard';
import OpportunityForm from '../../components/OpportunityForm';
import Modal from '../../components/Modal';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { useActiveBoost } from '../../hooks/useActiveBoost';
import { FaBriefcase, FaBolt, FaCalendarAlt, FaTrophy, FaStar } from 'react-icons/fa';
import PaystackCheckout from '../../components/PaystackCheckout';

const TABS = { ALL: 'All', PENDING: 'Pending' };
const PAGE_SIZE = 12;

function OpportunitiesContent() {
  const { user, userProfile } = useAuth();
  const { boost: activeBoost } = useActiveBoost();
  const [opportunities, setOpportunities] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [earlyAccessOpps, setEarlyAccessOpps] = useState([]);
  const [sponsorPayment, setSponsorPayment] = useState(null); // { oppId, email }

  const isAdmin = useMemo(() => userProfile?.role?.toLowerCase() === 'admin', [userProfile]);
  const isUltra = activeBoost?.tier === 'ULTRA';
  const toast = useToast();

  const loadOpportunities = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (!user) return;

    const stateSetter = append ? setLoadingMore : setLoading;
    stateSetter(true);
    if (!append) setError('');

    try {
      const page = await listOpportunitiesPage({ limit: PAGE_SIZE, cursor });
      setNextCursor(page.nextCursor);
      setOpportunities((prev) => (append ? [...prev, ...page.opportunities] : page.opportunities));
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      const errorMessage = 'Unable to load opportunities. Please try again.';
      setError(errorMessage);
      toast('error', errorMessage);
    } finally {
      stateSetter(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      loadOpportunities();
    } else if (!user) {
      setLoading(false);
      setOpportunities([]);
      setNextCursor(null);
    }
  }, [user, loadOpportunities]);

  useEffect(() => {
    if (!user || !isUltra) {
      setEarlyAccessOpps([]);
      return;
    }
    const fetchEarlyAccess = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/opportunities/early-access', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.eligible) setEarlyAccessOpps(data.opportunities || []);
      } catch {}
    };
    fetchEarlyAccess();
  }, [user, isUltra]);

  const handleFormSubmit = async (data) => {
    setIsFormModalOpen(false);
    
    try {
      const tags = typeof data.tags === 'string' ? data.tags.split(',').map((t) => t.trim()) : [];
      const wantsSponsor = data.wantsSponsor;
      const submissionData = { ...data, tags };
      delete submissionData.wantsSponsor;

      let result;
      if (editingOpp) {
        await updateOpportunity(editingOpp.id, submissionData);
        toast('success', 'Opportunity updated successfully!');
      } else {
        result = await createOpportunity(submissionData);
        toast('success', 'Opportunity submitted for review!');
      }

      setEditingOpp(null);
      setError('');
      await loadOpportunities();

      // If user wants to sponsor, show Paystack payment modal
      if (wantsSponsor && result?.id && !editingOpp) {
        setSponsorPayment({ oppId: result.id, email: user?.email });
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.message || 'There was an error. Please try again.';
      setError(errorMessage);
      toast('error', `Error submitting opportunity: ${errorMessage}`);
      setIsFormModalOpen(true);
    }
  };

  const handleEdit = (opp) => {
    const expiresAtValue = opp.expiresAt
      ? new Date(opp.expiresAt?.toDate ? opp.expiresAt.toDate() : opp.expiresAt).toISOString().slice(0, 16)
      : '';

    setEditingOpp({ ...opp, tags: opp.tags?.join(', '), expiresAt: expiresAtValue });
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this opportunity?')) {
      try {
        await deleteOpportunity(id);
        toast('success', 'Opportunity deleted.');
        setOpportunities(prev => prev.filter(o => o.id !== id));
      } catch (error) {
        console.error('Error deleting:', error);
        toast('error', 'Failed to delete opportunity.');
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveOpportunity(id);
      toast('success', 'Opportunity approved!');
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status: 'live' } : o));
    } catch (e) {
      console.error(e);
      toast('error', 'Failed to approve opportunity.');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectOpportunity(id);
      toast('success', 'Opportunity rejected.');
       setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status: 'rejected' } : o));
    } catch (e) {
      console.error(e);
      toast('error', 'Failed to reject opportunity.');
    }
  };

  const filteredOpps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let items = opportunities;
    if (activeTab === TABS.PENDING) {
      items = items.filter((o) => o.status === 'pending');
    }
    if (!query) return items;
    return items.filter((o) => {
      const haystack = [o.title, o.org, o.company, o.contactName, o.contactEmail, o.sourceLabel, o.description, ...(Array.isArray(o.tags) ? o.tags : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTab, opportunities, searchQuery]);

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:py-8 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Opportunity Board
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Connect with jobs, gigs, and collaborations in our community.
              </p>
            </div>
            <Button 
              onClick={() => { setEditingOpp(null); setIsFormModalOpen(true); }} 
              variant="primary" 
              className="hidden md:inline-flex w-auto mt-0 px-6"
            >
              + Add Opportunity
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="relative w-full md:w-1/2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, org, tags..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {isAdmin && (
              <div className="w-full md:w-auto border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                  <button 
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === TABS.ALL ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`} 
                    onClick={() => setActiveTab(TABS.ALL)}
                  >
                    All
                  </button>
                  <button 
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === TABS.PENDING ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`} 
                    onClick={() => setActiveTab(TABS.PENDING)}
                  >
                    Pending Review
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && !loading && (
          <ErrorAlert 
            message="Unable to load opportunities" 
            details={error}
            onClose={() => setError('')}
          />
        )}

        {/* Early Access Section - Ultra Boost Only */}
        {isUltra && earlyAccessOpps.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
                <FaBolt className="text-xs" />
                Early Access
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sponsored challenges visible to Ultra creators before public launch</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {earlyAccessOpps.map((opp) => (
                <div key={opp.id} className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Preview</div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white pr-16">{opp.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{opp.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {opp.sponsorName && <span className="flex items-center gap-1"><FaTrophy className="text-amber-500" />{opp.sponsorName}</span>}
                    {opp.deadline && <span className="flex items-center gap-1"><FaCalendarAlt />{new Date(opp.deadline).toLocaleDateString()}</span>}
                  </div>
                  {opp.prizeDescription && <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400">{opp.prizeDescription}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <SkeletonCards count={6} />
        ) : filteredOpps.length === 0 ? (
          <EmptyState 
            icon={FaBriefcase}
            title={searchQuery ? "No Opportunities Found" : "No Opportunities Yet"}
            message={searchQuery ? "Try adjusting your search filters." : "Be the first to share an opportunity with our community!"}
            actionLabel={searchQuery ? undefined : "+ Add Opportunity"}
            onAction={searchQuery ? undefined : () => { setEditingOpp(null); setIsFormModalOpen(true); }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredOpps.map((o) => (
                <OpportunityCard
                  key={o.id}
                  opportunity={o}
                  isAdmin={isAdmin}
                  user={user}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="flex justify-center">
                <Button 
                  onClick={() => loadOpportunities({ cursor: nextCursor, append: true })} 
                  disabled={loadingMore}
                  variant="secondary"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Modal 
        open={isFormModalOpen} 
        onClose={() => { setIsFormModalOpen(false); setEditingOpp(null); }} 
        title={editingOpp ? 'Edit Opportunity' : 'New Opportunity'}
      >
        <OpportunityForm
          onSubmit={handleFormSubmit}
          initialFormState={editingOpp || { title: '', org: '', link: '', description: '', tags: '' }}
          submitButtonText={editingOpp ? 'Update' : 'Submit for Review'}
        />
      </Modal>

      {/* Sponsor payment modal — shown after submission when user opts to sponsor */}
      {sponsorPayment && (
        <Modal open={true} onClose={() => setSponsorPayment(null)} title="Sponsor Opportunity">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <FaStar /> <span className="font-semibold">Pin your opportunity to the top for 30 days</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pay R50 to have your opportunity appear at the top of the board, highlighted as a sponsored listing.
            </p>
            <PaystackCheckout
              email={sponsorPayment.email}
              amountCents={5000}
              reference={`opp-sponsor-${sponsorPayment.oppId}-${Date.now()}`}
              metadata={{
                orderType: 'sponsoredOpportunity',
                orderId: sponsorPayment.oppId,
              }}
              onSuccess={() => {
                toast('success', 'Payment successful! Your opportunity is now sponsored and pinned.');
                setSponsorPayment(null);
                loadOpportunities();
              }}
              onError={(err) => {
                toast('error', `Payment failed: ${err.message}`);
                setSponsorPayment(null);
              }}
            />
          </div>
        </Modal>
      )}

      {/* FAB for mobile */}
      <button
        onClick={() => { setEditingOpp(null); setIsFormModalOpen(true); }}
        aria-label="Add opportunity"
        className="fixed bottom-6 right-6 md:hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full w-14 h-14 shadow-xl hover:shadow-2xl focus:outline-none z-50 flex items-center justify-center text-2xl font-bold transition-all duration-300 hover:scale-110"
      >
        +
      </button>
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <OpportunitiesContent />
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
