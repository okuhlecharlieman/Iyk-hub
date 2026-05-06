'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/ui/Button';
import { FaSyncAlt, FaCopy, FaDollarSign } from 'react-icons/fa';
import { useToast } from '../../../components/ui/ToastProvider';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    let d;
    if (typeof value.toDate === 'function') {
      d = value.toDate();
    } else if (value._seconds || value.seconds) {
      d = new Date((value._seconds || value.seconds) * 1000);
    } else if (typeof value === 'string' || typeof value === 'number') {
      d = new Date(value);
    } else {
      return '—';
    }
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const PAYMENT_STATUS_LABELS = {
  pending_payment: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

const ACTIVATION_STATUS_LABELS = {
  pending_activation: 'Pending',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const PAYMENT_COLORS = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const ACTIVATION_COLORS = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending_activation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  expired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const toast = useToast();

  const fetchOrders = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch('/api/admin/creator-boosts', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load payment orders');
      setOrders(json.items || []);
    } catch (err) {
      console.error('Failed to load payment orders:', err);
      setError(err.message || 'Failed to load payment orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (orderId, update) => {
    setUpdating(orderId);
    setError(null);
    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch('/api/admin/creator-boosts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId, ...update }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update order');
      toast('success', 'Order updated successfully');
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
      setError(err.message || 'Failed to update order');
    } finally {
      setUpdating(null);
    }
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  const paidCount = orders.filter(o => o.paymentStatus === 'paid').length;
  const activeCount = orders.filter(o => o.activationStatus === 'active').length;

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {orders.length} orders · {paidCount} paid · {activeCount} active
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchOrders} disabled={loading || !user}>
            <FaSyncAlt className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FaDollarSign className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No orders found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => copyId(order.id)} className="group flex items-center gap-1.5 font-mono text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Click to copy">
                          <span className="truncate max-w-[120px]">{copiedId === order.id ? 'Copied!' : order.id}</span>
                          <FaCopy className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" size={10} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{order.ownerName || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.ownerEmail || order.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">{order.plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${PAYMENT_COLORS[order.paymentStatus] || PAYMENT_COLORS.pending_payment}`}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${ACTIVATION_COLORS[order.activationStatus] || ACTIVATION_COLORS.pending_activation}`}>
                          {ACTIVATION_STATUS_LABELS[order.activationStatus] || order.activationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="primary" className="h-7 text-xs" disabled={updating === order.id || order.paymentStatus === 'paid'} onClick={() => updateOrder(order.id, { paymentStatus: 'paid' })}>
                            {updating === order.id ? '...' : 'Pay'}
                          </Button>
                          <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={updating === order.id || order.activationStatus === 'active'} onClick={() => updateOrder(order.id, { activationStatus: 'active' })}>
                            {updating === order.id ? '...' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{order.ownerName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.ownerEmail || order.email || '—'}</p>
                    </div>
                    <span className="capitalize px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">{order.plan}</span>
                  </div>

                  <button onClick={() => copyId(order.id)} className="mb-3 w-full text-left font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2 flex items-center justify-between hover:text-blue-600 transition-colors">
                    <span className="truncate">{copiedId === order.id ? 'Copied!' : order.id}</span>
                    <FaCopy size={10} />
                  </button>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${PAYMENT_COLORS[order.paymentStatus] || PAYMENT_COLORS.pending_payment}`}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${ACTIVATION_COLORS[order.activationStatus] || ACTIVATION_COLORS.pending_activation}`}>
                      {ACTIVATION_STATUS_LABELS[order.activationStatus] || order.activationStatus}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 self-center">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" className="flex-1 text-xs" disabled={updating === order.id || order.paymentStatus === 'paid'} onClick={() => updateOrder(order.id, { paymentStatus: 'paid' })}>
                      Mark Paid
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 text-xs" disabled={updating === order.id || order.activationStatus === 'active'} onClick={() => updateOrder(order.id, { activationStatus: 'active' })}>
                      Activate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
