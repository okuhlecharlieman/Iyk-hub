'use client';
import { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { listApprovedOpportunities, submitOpportunity, listPendingOpportunities, approveOpportunity, rejectOpportunity, getUserDoc } from '../../lib/firebaseHelpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Tabs from '../../components/Tabs';
import OpportunityCard from '../../components/OpportunityCard';
import OpportunityForm from '../../components/OpportunityForm';
import Modal from '../../components/Modal'; // Assuming a generic Modal component exists

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Approved');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([
        listApprovedOpportunities(50),
        user ? getUserDoc(user.uid) : Promise.resolve(null)
      ]);
      setApproved(a);
      const adminStatus = u?.role === 'admin';
      setIsAdmin(adminStatus);
      if (adminStatus) {
        const p = await listPendingOpportunities(50);
        setPending(p);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  const handleFormSubmit = async (form) => {
    await submitOpportunity(
      { ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) },
      user.uid
    );
    await load();
    alert('Your submission has been received and is pending approval. Thank you!');
  };

  const handleEdit = (opp) => {
    setEditingOpp({ ...opp, tags: opp.tags?.join(', ') });
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    await submitOpportunity({ ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) }, form.ownerId || user.uid, form.id, true);
    setModalOpen(false);
    setEditingOpp(null);
    await load();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this opportunity?")) {
      await rejectOpportunity(id, true);
      await load();
    }
  };

  const handleApprove = async (id) => { await approveOpportunity(id); await load(); };
  const handleReject = async (id) => { await rejectOpportunity(id); await load(); };

  const tabs = useMemo(() => [
    { name: 'Approved', count: approved.length },
    ...(isAdmin ? [{ name: 'Pending', count: pending.length }] : [])
  ], [approved.length, pending.length, isAdmin]);

  const displayedOpps = activeTab === 'Approved' ? approved : pending;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <OpportunityForm 
              onSubmit={handleFormSubmit} 
              initialFormState={{ title: '', org: '', description: '', link: '', tags: '' }}
              submitButtonText="Submit for Review"
              title="Share an Opportunity"
            />
          </div>
          <div className="lg:col-span-2">
            <div className="text-center lg:text-left mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Opportunity Board</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Explore and share opportunities within the community.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-lg">
              <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
              {loading ? <LoadingSpinner /> :
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 p-6">
                  {displayedOpps.length > 0 ? displayedOpps.map((o) => (
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
                  )) : <p className="text-center col-span-full py-10 text-gray-500 dark:text-gray-400">No opportunities found in this category.</p>}
                </div>
              }
            </div>
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <Modal open={isModalOpen} onClose={() => setModalOpen(false)} title="Edit Opportunity">
          <OpportunityForm
            onSubmit={handleSave}
            initialFormState={editingOpp}
            submitButtonText="Save Changes"
            title=""
          />
        </Modal>
      )}
    </ProtectedRoute>
  );
}
