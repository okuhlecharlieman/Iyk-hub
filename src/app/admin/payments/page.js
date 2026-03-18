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
                    <tr key={order.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-200">{order.id}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {order.ownerUid || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{order.plan}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        <span className="inline-flex items-center gap-2">
                          <span className="font-semibold">{PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        <span className="font-semibold">{ACTIVATION_STATUS_LABELS[order.activationStatus] || order.activationStatus}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={updating === order.id}
                            onClick={() => updateOrder(order.id, { paymentStatus: 'paid' })}
                          >
                            Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={updating === order.id}
                            onClick={() => updateOrder(order.id, { activationStatus: 'active' })}
                          >
                            Activate
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
