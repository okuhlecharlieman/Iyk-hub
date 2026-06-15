'use client';
/**
 * Page component for /admin/promotions.
 */
import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { FaGift, FaCoins, FaEnvelope, FaSync, FaCopy, FaTrash, FaHistory, FaUsers, FaTicketAlt } from 'react-icons/fa';
import { ROLE_OPTIONS, formatRoleLabel } from '../../../lib/roles';

const TABS = [
  { id: 'allocate', label: 'Allocate Points', icon: <FaCoins /> },
  { id: 'codes', label: 'Promo Codes', icon: <FaTicketAlt /> },
  { id: 'email', label: 'Send Email', icon: <FaEnvelope /> },
  { id: 'history', label: 'History', icon: <FaHistory /> },
];

/** PromotionsPage — main page component. */
export default function PromotionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('allocate');
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState([]);
  const [history, setHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setDataLoading(true);
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/promos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCodes(data.codes || []);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch promo data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaGift className="text-purple-500" /> Promotions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Allocate points, create promo codes, and send emails</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchData} disabled={dataLoading}>
            <FaSync className={`mr-1.5 ${dataLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'allocate' && <AllocatePointsTab user={user} toast={toast} loading={loading} setLoading={setLoading} onDone={fetchData} />}
        {activeTab === 'codes' && <PromoCodesTab user={user} toast={toast} codes={codes} loading={loading} setLoading={setLoading} onDone={fetchData} dataLoading={dataLoading} />}
        {activeTab === 'email' && <SendEmailTab user={user} toast={toast} codes={codes} loading={loading} setLoading={setLoading} onDone={fetchData} />}
        {activeTab === 'history' && <HistoryTab history={history} dataLoading={dataLoading} />}
      </div>
    </ProtectedRoute>
  );
}

/** AllocatePointsTab — tab panel component. */
function AllocatePointsTab({ user, toast, loading, setLoading, onDone }) {
  const [points, setPoints] = useState('');
  const [target, setTarget] = useState('all');
  const [filterValue, setFilterValue] = useState('');

  /** Handles submit action. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!points || Number(points) <= 0) { toast('error', 'Enter a valid points amount'); return; }
    if ((target === 'role' || target === 'email') && !filterValue.trim()) { toast('error', 'Enter a filter value'); return; }

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/promos/allocate-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ points: Number(points), target, filterValue: filterValue.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to allocate points');
      toast('success', `${data.description} (${data.usersAffected} users)`);
      setPoints('');
      setFilterValue('');
      onDone();
    } catch (err) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FaCoins className="text-yellow-500" /> Allocate Points to Users
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points Amount</label>
          <input
            type="number" min="1" max="100000" value={points} onChange={(e) => setPoints(e.target.value)}
            placeholder="e.g. 500"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target</label>
          <select
            value={target} onChange={(e) => setTarget(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="role">By Role</option>
            <option value="email">Specific Email</option>
          </select>
        </div>
        {target === 'role' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={filterValue} onChange={(e) => setFilterValue(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role...</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
        )}
        {target === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User Email</label>
            <input
              type="email" value={filterValue} onChange={(e) => setFilterValue(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        <Button type="submit" disabled={loading} variant="primary">
          {loading ? 'Allocating...' : 'Allocate Points'}
        </Button>
      </form>
    </div>
  );
}

/** PromoCodesTab — tab panel component. */
function PromoCodesTab({ user, toast, codes, loading, setLoading, onDone, dataLoading }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [points, setPoints] = useState('');
  const [count, setCount] = useState('1');
  const [prefix, setPrefix] = useState('IYK');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');

  /** Handles create action. */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!points || Number(points) <= 0) { toast('error', 'Enter a valid points amount'); return; }
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const payload = {
        points: Number(points),
        count: Number(count) || 1,
        prefix: prefix.trim() || 'IYK',
      };
      if (maxRedemptions) payload.maxRedemptions = Number(maxRedemptions);
      if (expiresInDays) payload.expiresInDays = Number(expiresInDays);

      const res = await fetch('/api/admin/promos/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create codes');
      toast('success', `Created ${data.codes.length} promo code(s)`);
      setCreateOpen(false);
      setPoints(''); setCount('1'); setPrefix('IYK'); setMaxRedemptions(''); setExpiresInDays('');
      onDone();
    } catch (err) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Handles deactivate action. */
  const handleDeactivate = async (codeId) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/promos/codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ codeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate');
      toast('success', 'Code deactivated');
      onDone();
    } catch (err) {
      toast('error', err.message);
    }
  };

  /** copy Code. */
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast('success', `Copied: ${code}`);
  };

  if (dataLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FaTicketAlt className="text-indigo-500" /> Promo Codes ({codes.length})
        </h2>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>+ Create Codes</Button>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FaTicketAlt className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No promo codes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Points</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Redeemed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{c.code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.points}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {c.redemptions || 0}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        {!c.active ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Inactive</span>
                        ) : isExpired ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Expired</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => copyCode(c.code)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Copy code">
                            <FaCopy size={14} />
                          </button>
                          {c.active && (
                            <button onClick={() => handleDeactivate(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Deactivate">
                              <FaTrash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Promo Codes">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points per Code</label>
            <input type="number" min="1" max="100000" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 100"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Codes</label>
              <input type="number" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prefix</label>
              <input type="text" maxLength={6} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="IYK"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Redemptions <span className="text-gray-400">(optional)</span></label>
              <input type="number" min="1" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Unlimited"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires in Days <span className="text-gray-400">(optional)</span></label>
              <input type="number" min="1" max="365" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="Never"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** SendEmailTab — tab panel component. */
function SendEmailTab({ user, toast, codes, loading, setLoading, onDone }) {
  const [selectedCode, setSelectedCode] = useState('');
  const [emailTarget, setEmailTarget] = useState('all');
  const [emails, setEmails] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [message, setMessage] = useState('');

  const activeCodes = codes.filter((c) => c.active && (!c.expiresAt || new Date(c.expiresAt) > new Date()));

  /** Handles send action. */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedCode) { toast('error', 'Select a promo code'); return; }
    const code = codes.find((c) => c.code === selectedCode);
    if (!code) { toast('error', 'Invalid code selected'); return; }

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const payload = {
        promoCode: selectedCode,
        points: code.points,
        message: message.trim() || undefined,
      };

      if (emailTarget === 'specific') {
        payload.emails = emails.split(',').map((e) => e.trim()).filter(Boolean);
        if (payload.emails.length === 0) { toast('error', 'Enter at least one email'); setLoading(false); return; }
      } else if (emailTarget === 'role') {
        payload.target = 'role';
        payload.filterValue = roleFilter;
        if (!roleFilter) { toast('error', 'Select a role'); setLoading(false); return; }
      } else {
        payload.target = 'all';
      }

      const res = await fetch('/api/admin/promos/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send emails');
      toast('success', `Sent to ${data.sentCount} users${data.failedCount ? ` (${data.failedCount} failed)` : ''}`);
      onDone();
    } catch (err) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FaEnvelope className="text-blue-500" /> Send Promo Code via Email
      </h2>
      {activeCodes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">No active promo codes available. Create one first in the Promo Codes tab.</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo Code</label>
            <select value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option value="">Select a code...</option>
              {activeCodes.map((c) => (
                <option key={c.code} value={c.code}>{c.code} ({c.points} pts)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send To</label>
            <select value={emailTarget} onChange={(e) => setEmailTarget(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
              <option value="all">All Users</option>
              <option value="role">By Role</option>
              <option value="specific">Specific Emails</option>
            </select>
          </div>
          {emailTarget === 'role' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
                <option value="">Select a role...</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
          )}
          {emailTarget === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Addresses (comma-separated)</label>
              <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={3}
                placeholder="user1@example.com, user2@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Message <span className="text-gray-400">(optional)</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
              placeholder="Thank you for being an awesome member!"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none" />
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Emails'}
          </Button>
        </form>
      )}
    </div>
  );
}

/** HistoryTab — tab panel component. */
function HistoryTab({ history, dataLoading }) {
  if (dataLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  const typeLabels = {
    points_allocation: { label: 'Points Allocated', icon: <FaCoins className="text-yellow-500" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    codes_created: { label: 'Codes Created', icon: <FaTicketAlt className="text-indigo-500" />, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    email_sent: { label: 'Emails Sent', icon: <FaEnvelope className="text-blue-500" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <FaHistory className="text-gray-500" /> Promotion History
      </h2>
      {history.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FaHistory className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No promotion history yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const typeInfo = typeLabels[item.type] || { label: item.type, icon: <FaGift />, color: 'bg-gray-100 text-gray-700' };
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
                <div className="mt-0.5">{typeInfo.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                    <span className="text-xs text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.type === 'points_allocation' && `${item.points} pts to ${item.usersAffected} user(s) • Target: ${item.target}${item.filterValue ? ` (${item.filterValue})` : ''}`}
                    {item.type === 'codes_created' && `${item.codes?.length || 0} code(s) • ${item.points} pts each`}
                    {item.type === 'email_sent' && `${item.sentCount} sent, ${item.failedCount} failed • Code: ${item.promoCode}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">by {item.adminEmail || 'Unknown'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
