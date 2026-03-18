'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/ui/Button';
import { FaDollarSign, FaSyncAlt } from 'react-icons/fa';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
};

const PAYMENT_STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

const ACTIVATION_STATUS_LABELS = {
  pending_activation: 'Pending Activation',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [updating, setUpdating] = useState(null);

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
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
      setError(err.message || 'Failed to update order');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Payments</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Review and manage creator boost orders and payment status.</p>
          </div>
          <Button variant="secondary" onClick={fetchOrders} disabled={loading || !user}>
            <FaSyncAlt className="mr-2" /> Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 p-4">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Activation</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      No creator boost orders found.
                    </td>
                  </tr>
                ) : (
           orders.map((order) => (
  <tr key={order.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
      {order.id.slice(0, 8)}...
    </td>
    
    {/* Updated User Column to show Name and Email */}
    <td className="px-4 py-3">
      <div className="flex flex-col">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {order.ownerName || 'Unknown User'}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {order.ownerEmail || order.email || 'No email provided'}
        </span>
      </div>
    </td>

    <td className="px-4 py-3">
      <span className="capitalize px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
        {order.plan}
      </span>
    </td>
    
    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
      <span className={`text-xs font-bold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
        {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
      </span>
    </td>
    
    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
      <span className={`text-xs font-bold ${order.activationStatus === 'active' ? 'text-green-600' : 'text-blue-600'}`}>
        {ACTIVATION_STATUS_LABELS[order.activationStatus] || order.activationStatus}
      </span>
    </td>
    
    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
      {formatDate(order.createdAt)}
    </td>

    <td className="px-4 py-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          className="h-8 text-xs"
          disabled={updating === order.id || order.paymentStatus === 'paid'}
          onClick={() => updateOrder(order.id, { paymentStatus: 'paid' })}
        >
          {updating === order.id ? '...' : 'Mark Paid'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          disabled={updating === order.id || order.activationStatus === 'active'}
          onClick={() => updateOrder(order.id, { activationStatus: 'active' })}
        >
          {updating === order.id ? '...' : 'Activate'}
        </Button>
      </div>
    </td>
  </tr>
))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-4">
          <p className="text-sm text-blue-800 dark:text-blue-100">
            This page is intended for administrators to manage boost orders and ensure payment/activation status is correct.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
