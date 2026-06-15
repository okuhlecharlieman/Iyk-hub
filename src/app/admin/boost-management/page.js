'use client';
/**
 * Page component for /admin/boost-management.
 */
import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaClock, FaPlay, FaPause, FaRocket, FaUser, FaCalendar, FaDollarSign, FaEdit, FaEye, FaCopy } from 'react-icons/fa';

const STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  pending_activation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PAYMENT_STATUS_OPTIONS = ['pending_payment', 'paid', 'failed', 'refunded'];
const ACTIVATION_STATUS_OPTIONS = ['pending_activation', 'active', 'expired', 'cancelled'];

/** BoostManagementPage — main page component. */
export default function BoostManagementPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [activationFilter, setActivationFilter] = useState('');
  const [selectedBoost, setSelectedBoost] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchBoosts = useCallback(async () => {
    if (!user) {
      setError('You must be signed in to load boost records.');
      setBoosts([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/creator-boosts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch boosts');
      }
      setBoosts(data.items || []);
    } catch (err) {
      console.error('Boost fetch error:', err);
      setError(err.message || 'Failed to load boost records');
      setBoosts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBoosts();
  }, [fetchBoosts]);

  /** update Boost Status. */
  const updateBoostStatus = async (orderId, updates) => {
    if (!user) {
      setError('You must be signed in to update boost orders.');
      return;
    }

    try {
      setUpdating(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/creator-boosts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, ...updates }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || json.message || 'Failed to update boost');
      }
      await fetchBoosts();
      setShowModal(false);
      setSelectedBoost(null);
      toast('success', 'Boost order updated successfully.');
    } catch (err) {
      console.error('Boost update error:', err);
      setError(err.message || 'Failed to update boost order');
    } finally {
      setUpdating(false);
    }
  };

  const filteredBoosts = boosts.filter(boost => {
    const matchesSearch = !searchTerm ||
      boost.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boost.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boost.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boost.targetType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boost.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPayment = !paymentFilter || boost.paymentStatus === paymentFilter;
    const matchesActivation = !activationFilter || boost.activationStatus === activationFilter;

    return matchesSearch && matchesPayment && matchesActivation;
  });

  /** Formats/parses data — formatDate. */
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    let date;
    try {
      if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp?._seconds != null || timestamp?.seconds != null) {
        const seconds = Number(timestamp._seconds ?? timestamp.seconds);
        const nanoseconds = Number(timestamp._nanoseconds ?? timestamp.nanoseconds ?? 0);
        date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
    } catch {
      date = null;
    }

    if (!date || isNaN(date.getTime())) return 'N/A';
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  /** Fetches/retrieves data — getTimeRemaining. */
  const getTimeRemaining = (timestamp) => {
    const target = timestamp ? new Date(timestamp?.toDate ? timestamp.toDate() : timestamp) : null;
    if (!target || Number.isNaN(target.getTime())) return 'N/A';
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <ProtectedRoute adminOnly={true}>
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Boost Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage creator boost orders and activations</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by user name, email, plan, target, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Payment Status</option>
                {PAYMENT_STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
              <select
                value={activationFilter}
                onChange={(e) => setActivationFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Activation Status</option>
                {ACTIVATION_STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaRocket className="text-blue-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{boosts.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Boosts</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-green-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {boosts.filter(b => b.activationStatus === 'active').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaClock className="text-yellow-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {boosts.filter(b => b.paymentStatus === 'pending_payment').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Payment</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaPause className="text-orange-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {boosts.filter(b => b.activationStatus === 'pending_activation').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Activation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Boosts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBoosts.map((boost) => (
                  <tr key={boost.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{boost.ownerName || 'Unknown'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{boost.ownerEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">{boost.plan}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">R{boost.amount}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">{boost.targetType}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-32">{boost.targetId}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[boost.paymentStatus] || 'bg-gray-100 text-gray-800'}`}>
                        {boost.paymentStatus?.replace('_', ' ') || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[boost.activationStatus] || 'bg-gray-100 text-gray-800'}`}>
                        {boost.activationStatus?.replace('_', ' ') || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{formatDate(boost.expiresAt)}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">{getTimeRemaining(boost.expiresAt)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[10rem]">{boost.id}</span>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(boost.id || '');
                            toast('success', 'Order ID copied to clipboard');
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                          aria-label="Copy order ID"
                        >
                          <FaCopy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(boost.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBoost(boost);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      >
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredBoosts.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No boosts found matching your criteria.
            </div>
          )}
        </div>

        {/* Update Modal */}
        {showModal && selectedBoost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Update Boost Status</h3>
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-sm">
                  <p className="text-gray-900 dark:text-white font-medium">{selectedBoost.ownerName || selectedBoost.ownerEmail || 'Unknown user'}</p>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Expires: {formatDate(selectedBoost.expiresAt)}</p>
                  <p className="text-emerald-600 dark:text-emerald-400">Time Remaining: {getTimeRemaining(selectedBoost.expiresAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
                  <select
                    value={selectedBoost.paymentStatus || ''}
                    onChange={(e) => setSelectedBoost({...selectedBoost, paymentStatus: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {PAYMENT_STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activation Status</label>
                  <select
                    value={selectedBoost.activationStatus || ''}
                    onChange={(e) => setSelectedBoost({...selectedBoost, activationStatus: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {ACTIVATION_STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Note</label>
                  <textarea
                    value={selectedBoost.note || ''}
                    onChange={(e) => setSelectedBoost({...selectedBoost, note: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Optional note for this update..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateBoostStatus(selectedBoost.id, {
                    paymentStatus: selectedBoost.paymentStatus,
                    activationStatus: selectedBoost.activationStatus,
                    note: selectedBoost.note
                  })}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
