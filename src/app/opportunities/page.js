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
import { FaBriefcase } from 'react-icons/fa';

const TABS = { ALL: 'All', PENDING: 'Pending' };
const PAGE_SIZE = 12;

function OpportunitiesContent() {
  const { user, userProfile } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = useMemo(() => userProfile?.role === 'admin', [userProfile]);
  const toast = useToast();

  const loadOpportunities = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (!user) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const page = await listOpportunitiesPage({ limit: PAGE_SIZE, cursor });
      setNextCursor(page.nextCursor);
      setOpportunities((prev) => (append ? [...prev, ...page.opportunities] : page.opportunities));
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setError('Unable to load opportunities. Please try again.');
      toast('error', 'Unable to load opportunities.');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
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

  const handleFormSubmit = async (data) => {
    try {
      const tags = typeof data.tags === 'string' ? data.tags.split(',').map((t) => t.trim()) : [];
      let submissionData = { ...data, tags };

      if (editingOpp) {
        await updateOpportunity(editingOpp.id, submissionData);
        toast('success', 'Opportunity updated successfully!');
      } else {
        submissionData = { ...submissionData, ownerId: user.uid };
        await createOpportunity(submissionData);
        toast('success', 'Opportunity submitted for review!');
      }

      setIsFormModalOpen(false);
      setEditingOpp(null);
      setError('');
      await loadOpportunities();
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error.message || 'There was an error. Please try again.');
      toast('error', 'Error submitting opportunity.');
    }
  };

  const handleEdit = (opp) => {
    setEditingOpp({ ...opp, tags: opp.tags?.join(', ') });
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this opportunity?')) {
      try {
        await deleteOpportunity(id);
        toast('success', 'Opportunity deleted.');
        await loadOpportunities();
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
      await loadOpportunities();
    } catch (e) {
      console.error(e);
      toast('error', 'Failed to approve opportunity.');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectOpportunity(id);
      toast('success', 'Opportunity rejected.');
      await loadOpportunities();
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
      const haystack = [o.title, o.org, o.description, ...(Array.isArray(o.tags) ? o.tags : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTab, opportunities, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 md:px-8">
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
              className="w-full md:w-auto mt-6 md:mt-0 px-6"
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
        {error && (
          <ErrorAlert 
            message="Unable to load opportunities" 
            details={error}
            onClose={() => setError('')}
          />
        )}

        {/* Content */}
        {loading ? (
          <SkeletonCards count={6} />
        ) : error && filteredOpps.length === 0 ? (
          <ErrorEmptyState 
            title="Failed to Load Opportunities"
            message={error}
            onRetry={() => loadOpportunities()}
          />
        ) : filteredOpps.length === 0 ? (
          <EmptyState 
            icon={FaBriefcase}
            title="No opportunities yet"
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
