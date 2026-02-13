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
  onOpportunitiesUpdate // Import the new real-time listener
} from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import OpportunityCard from '../../components/OpportunityCard';
import OpportunityForm from '../../components/OpportunityForm';
import Modal from '../../components/Modal';

const TABS = { ALL: 'All', PENDING: 'Pending' };

export default function OpportunitiesPage() {
  const { user, userProfile } = useAuth(); // Get userProfile from AuthContext
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.ALL);

  const isAdmin = useMemo(() => userProfile?.role === 'admin', [userProfile]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Set up the real-time listener
    const unsubscribe = onOpportunitiesUpdate(isAdmin, (opps) => {
      setOpportunities(opps);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching opportunities:", error);
      setLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleFormSubmit = async (data) => {
    try {
        const tags = typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()) : [];
        let submissionData = { ...data, tags };

        if (editingOpp) {
            await updateOpportunity(editingOpp.id, submissionData);
            alert('Opportunity updated successfully!');
        } else {
            submissionData = { ...submissionData, ownerId: user.uid };
            await createOpportunity(submissionData);
            alert('Opportunity submitted for review!');
        }
        setIsFormModalOpen(false);
        setEditingOpp(null);
        // No need to call loadOpportunities, real-time listener will handle it
    } catch (error) {
        console.error("Error submitting form:", error);
        alert('There was an error. Please try again.');
    }
  };

  const handleEdit = (opp) => {
    setEditingOpp({ ...opp, tags: opp.tags?.join(', ') });
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this opportunity?")) {
      try {
        await deleteOpportunity(id);
        // No need to call loadOpportunities, real-time listener will handle it
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const handleApprove = async (id) => {
    try { await approveOpportunity(id); } catch (e) { console.error(e); }
  };

  const handleReject = async (id) => {
    try { await rejectOpportunity(id); } catch (e) { console.error(e); }
  };

  const filteredOpps = useMemo(() => {
    if (activeTab === TABS.PENDING) {
      return opportunities.filter(o => o.status === 'pending');
    }
    return opportunities;
  }, [activeTab, opportunities]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="md:flex justify-between items-center mb-8">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Opportunity Board</h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Connect with jobs, gigs, and collaborations in our community.</p>
            </div>
            <button onClick={() => { setEditingOpp(null); setIsFormModalOpen(true); }} className="btn-primary w-full md:w-auto mt-6 md:mt-0">+ Add Opportunity</button>
          </div>

          {isAdmin && (
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-6">
                <button className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === TABS.ALL ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} onClick={() => setActiveTab(TABS.ALL)}>All</button>
                <button className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === TABS.PENDING ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} onClick={() => setActiveTab(TABS.PENDING)}>Pending Review</button>
              </nav>
            </div>
          )}

          {loading ? <LoadingSpinner /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpps.map(o => (
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
          )}
        </div>
      </div>

      <Modal open={isFormModalOpen} onClose={() => { setIsFormModalOpen(false); setEditingOpp(null); }} title={editingOpp ? 'Edit Opportunity' : 'New Opportunity'}>
        <OpportunityForm
          onSubmit={handleFormSubmit}
          initialFormState={editingOpp || { title: '', org: '', link: '', description: '', tags: '' }}
          submitButtonText={editingOpp ? 'Update' : 'Submit for Review'}
        />
      </Modal>
    </ProtectedRoute>
  );
}
