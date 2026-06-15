'use client';
/**
 * Page component for /admin/payments.
 */
import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/ui/Button';
import { FaSyncAlt, FaDollarSign, FaFilter, FaCalendarAlt, FaSearch } from 'react-icons/fa';

/** Formats/parses data — formatCurrency. */
const formatCurrency = (cents) => {
  if (cents === undefined || cents === null) return 'R0.00';
  return `R${(cents / 100).toFixed(2)}`;
};

/** Formats/parses data — formatDate. */
const formatDate = (value) => {
  if (!value) return '—';
  try {
    let d;
    if (value?.toDate && typeof value.toDate === 'function') {
      d = value.toDate();
    } else if (value?._seconds != null || value?.seconds != null) {
      const seconds = Number(value._seconds ?? value.seconds);
      const nanoseconds = Number(value._nanoseconds ?? value.nanoseconds ?? 0);
      d = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
    } else if (typeof value === 'string' || typeof value === 'number') {
      d = new Date(value);
    } else {
      return '—';
    }
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const REVENUE_STREAM_LABELS = {
  sponsoredChallenge: 'Sponsored Challenges',
  creatorBoost: 'Creator Boosts',
  institutionPlan: 'Institution Plans',
  sponsoredOpportunity: 'Sponsored Opportunities',
  placementFee: 'Placement Fees',
  donation: 'Donations',
  unknown: 'Other',
};

const REVENUE_STREAM_COLORS = {
  sponsoredChallenge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  creatorBoost: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  institutionPlan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sponsoredOpportunity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  placementFee: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  donation: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const STREAM_FALLBACK_CONFIG = {
  creatorBoost: {
    endpoint: '/api/admin/creator-boosts',
    buildEntry: (order) => ({
      id: order.id,
      orderType: 'creatorBoost',
      orderId: order.id,
      amountCents: order.feeCents || order.amountCents || 0,
      entryType: order.paymentStatus === 'paid' ? 'charge_succeeded' : 'charge_pending',
      description: order.plan ? `${order.plan} boost` : 'Creator Boost',
      createdAt: order.createdAt,
    }),
    buildSummary: (orders) => ({
      grossCents: orders.reduce((sum, order) => sum + (order.feeCents || order.amountCents || 0), 0),
      count: orders.length,
    }),
  },
  institutionPlan: {
    endpoint: '/api/admin/institutions',
    buildEntry: (order) => ({
      id: order.id,
      orderType: 'institutionPlan',
      orderId: order.id,
      amountCents: order.feeCents || order.amountCents || 0,
      entryType: order.paymentStatus === 'paid' ? 'charge_succeeded' : 'charge_pending',
      description: order.plan ? `${order.plan} institution plan` : 'Institution Plan',
      createdAt: order.createdAt,
    }),
    buildSummary: (orders) => ({
      grossCents: orders.reduce((sum, order) => sum + (order.feeCents || order.amountCents || 0), 0),
      count: orders.length,
    }),
  },
  sponsoredOpportunity: {
    endpoint: '/api/admin/sponsored-opportunities',
    buildEntry: (order) => ({
      id: order.id,
      orderType: 'sponsoredOpportunity',
      orderId: order.id,
      amountCents: order.amountCents || order.feeCents || 0,
      entryType: order.paymentStatus === 'paid' ? 'charge_succeeded' : 'charge_pending',
      description: order.title || order.orderId ? `Sponsored opportunity ${order.orderId || order.id}` : 'Sponsored Opportunity',
      createdAt: order.createdAt,
    }),
    buildSummary: (orders) => ({
      grossCents: orders.reduce((sum, order) => sum + (order.amountCents || order.feeCents || 0), 0),
      count: orders.length,
    }),
  },
  placementFee: {
    endpoint: '/api/admin/placements-fees',
    buildEntry: (order) => ({
      id: order.id,
      orderType: 'placementFee',
      orderId: order.id,
      amountCents: order.amountCents || order.feeCents || 0,
      entryType: order.feeStatus === 'paid' ? 'charge_succeeded' : 'charge_pending',
      description: order.description || order.targetId ? `Placement fee ${order.targetId || order.id}` : 'Placement Fee',
      createdAt: order.createdAt,
    }),
    buildSummary: (orders) => ({
      grossCents: orders.reduce((sum, order) => sum + (order.amountCents || order.feeCents || 0), 0),
      count: orders.length,
    }),
  },
};

/** Fetches/retrieves data — fetchStreamFallbackItems. */
async function fetchStreamFallbackItems(streamType, token) {
  const config = STREAM_FALLBACK_CONFIG[streamType];
  if (!config) return [];

  const response = await fetch(config.endpoint, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) return [];

  const json = await response.json();
  const items = json.items || [];
  const paidItems = items.filter(item => {
    if (streamType === 'placementFee') return item.feeStatus === 'paid';
    return item.paymentStatus === 'paid';
  });
  return paidItems.map(config.buildEntry);
}

/** Fetches/retrieves data — fetchStreamFallbackSummary. */
async function fetchStreamFallbackSummary(streamType, token) {
  const config = STREAM_FALLBACK_CONFIG[streamType];
  if (!config) return null;

  const response = await fetch(config.endpoint, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) return null;

  const json = await response.json();
  const items = json.items || [];
  const paidItems = items.filter(item => {
    if (streamType === 'placementFee') return item.feeStatus === 'paid';
    return item.paymentStatus === 'paid';
  });
  return config.buildSummary(paidItems);
}

/** enrich Summary With Fallbacks. */
async function enrichSummaryWithFallbacks(currentSummary, token) {
  if (!currentSummary) return currentSummary;

  const updatedSummary = {
    ...currentSummary,
    byOrderType: { ...(currentSummary.byOrderType || {}) },
  };

  for (const streamType of Object.keys(STREAM_FALLBACK_CONFIG)) {
    const existing = updatedSummary.byOrderType[streamType];
    if (existing && existing.count > 0) continue;

    const fallbackSummary = await fetchStreamFallbackSummary(streamType, token);
    if (!fallbackSummary) continue;

    updatedSummary.byOrderType[streamType] = fallbackSummary;
    updatedSummary.grossRevenueCents = (updatedSummary.grossRevenueCents || 0) + fallbackSummary.grossCents;
  }

  return updatedSummary;
}

/** AdminPaymentsPage — main page component. */
export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedStream, setSelectedStream] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : null;
      const params = new URLSearchParams();
      if (selectedMonth) {
        params.set('period', selectedMonth);
      } else {
        params.set('period', '30d');
      }

      // Try financial ledger API first
      try {
        const summaryRes = await fetch(`/api/admin/financial-ledger?view=summary&${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const summaryJson = await summaryRes.json();
        if (summaryRes.ok) {
          const enrichedSummary = await enrichSummaryWithFallbacks(summaryJson.summary, token);
          setSummary(enrichedSummary);
        } else {
          throw new Error('Financial ledger not available');
        }
      } catch (ledgerError) {
        // Fallback to monetization API
        console.log('Financial ledger not available, using monetization API');
        const monetizationRes = await fetch(`/api/admin/monetization?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const monetizationJson = await monetizationRes.json();
        if (!monetizationRes.ok) throw new Error(monetizationJson.error || 'Unable to load revenue data');

        // Convert monetization data to summary format
        const convertedSummary = {
          grossRevenueCents: monetizationJson.summary.totalRevenueCents,
          byOrderType: {},
          entryCount: 0,
        };

        monetizationJson.revenueByType.forEach(item => {
          convertedSummary.byOrderType[item.type] = {
            grossCents: item.revenueCents,
            count: item.count,
          };
        });

        const enrichedSummary = await enrichSummaryWithFallbacks(convertedSummary, token);
        setSummary(enrichedSummary);
      }

      // Fetch entries - try financial ledger first, then fallback
      let loadedEntries = [];
      try {
        const entriesParams = new URLSearchParams();
        // Always fetch all entries - let filteredEntries handle stream filtering
        entriesParams.set('limit', '500');

        const entriesRes = await fetch(`/api/admin/financial-ledger?view=entries&${entriesParams}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const entriesJson = await entriesRes.json();
        if (entriesRes.ok) {
          loadedEntries = entriesJson.entries || [];
          loadedEntries = loadedEntries.filter(entry => entry.entryType === 'charge_succeeded');
        } else {
          throw new Error('Financial ledger entries not available');
        }
      } catch (entriesError) {
        console.log('Financial ledger entries not available, using recent payments');
        const monetizationRes = await fetch(`/api/admin/monetization?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const monetizationJson = await monetizationRes.json();
        if (monetizationRes.ok) {
          loadedEntries = (monetizationJson.recentPayments || []).map(payment => ({
            id: payment.id,
            orderType: payment.orderType,
            orderId: payment.orderId,
            amountCents: payment.amountCents,
            entryType: 'charge_succeeded',
            description: `${payment.orderType} payment`,
            createdAt: payment.createdAt,
          }));
        }
      }

      const loadedTypes = new Set(loadedEntries.map(entry => entry.orderType));
      const fallbackStreams = selectedStream === 'all'
        ? Object.keys(STREAM_FALLBACK_CONFIG)
        : [selectedStream];

      for (const streamType of fallbackStreams) {
        const config = STREAM_FALLBACK_CONFIG[streamType];
        if (!config) continue;
        if (loadedTypes.has(streamType)) continue;

        const fallbackEntries = await fetchStreamFallbackItems(streamType, token);
        loadedEntries = loadedEntries.concat(fallbackEntries);
      }

      setEntries(loadedEntries);
    } catch (err) {
      console.error('Failed to load revenue data:', err);
      setError(err.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedStream, selectedMonth]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const filteredEntries = entries.filter(entry => {
    // Filter by revenue stream
    if (selectedStream !== 'all' && entry.orderType !== selectedStream) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      /** order Id. */
      const orderId = (entry.orderId || '').toLowerCase();
      /** description. */
      const description = (entry.description || '').toLowerCase();
      /** order Type. */
      const orderType = (entry.orderType || '').toLowerCase();

      return orderId.includes(term) ||
             description.includes(term) ||
             orderType.includes(term) ||
             REVENUE_STREAM_LABELS[entry.orderType]?.toLowerCase().includes(term);
    }

    return true;
  });

  /** Fetches/retrieves data — getTotalRevenue. */
  const getTotalRevenue = () => {
    if (!summary) return 0;
    if (selectedStream === 'all') return summary.grossRevenueCents || 0;
    return summary.byOrderType[selectedStream]?.grossCents || 0;
  };

  /** Fetches/retrieves data — getRevenueStreams. */
  const getRevenueStreams = () => {
    if (!summary || !summary.byOrderType) return [];
    return Object.entries(summary.byOrderType).map(([type, data]) => ({
      type,
      ...data,
      label: REVENUE_STREAM_LABELS[type] || type,
    }));
  };

  // Get all available revenue streams for dropdown (including ones with 0 revenue)
  const getAllRevenueStreams = () => {
    const availableStreams = getRevenueStreams();
    const allTypes = Object.keys(REVENUE_STREAM_LABELS);

    return allTypes.map(type => {
      const existing = availableStreams.find(s => s.type === type);
      return existing || {
        type,
        label: REVENUE_STREAM_LABELS[type],
        grossCents: 0,
        count: 0,
      };
    });
  };

  const monthOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Revenue Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and analyze all platform revenue streams
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading || !user}>
            <FaSyncAlt className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaSearch className="inline mr-1" /> Search Transactions
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, description, or type..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaFilter className="inline mr-1" /> Revenue Stream
            </label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Revenue Streams</option>
              {getAllRevenueStreams().map(stream => (
                <option key={stream.type} value={stream.type}>
                  {stream.label} ({stream.count} transactions)
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaCalendarAlt className="inline mr-1" /> Time Period
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
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
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(getTotalRevenue())}</p>
                  </div>
                  <FaDollarSign className="text-2xl text-green-500" />
                </div>
              </div>

              {selectedStream === 'all' && getRevenueStreams().slice(0, 3).map(stream => (
                <div key={stream.type} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stream.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stream.grossCents)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stream.count} transactions</p>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${REVENUE_STREAM_COLORS[stream.type] || REVENUE_STREAM_COLORS.unknown}`}>
                      {stream.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue Streams Breakdown */}
            {selectedStream === 'all' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Stream</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {getAllRevenueStreams().filter(s => s.type !== 'unknown').map(stream => (
                    <div key={stream.type} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${REVENUE_STREAM_COLORS[stream.type] || REVENUE_STREAM_COLORS.unknown}`}>
                          {stream.label}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{stream.count} transactions</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(stream.grossCents)}</p>
                        {stream.refundsCents > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400">-{formatCurrency(stream.refundsCents)} refunds</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Transactions {selectedStream !== 'all' && `(${REVENUE_STREAM_LABELS[selectedStream] || selectedStream})`}
                </h3>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <FaDollarSign className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No transactions found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${REVENUE_STREAM_COLORS[entry.orderType] || REVENUE_STREAM_COLORS.unknown}`}>
                                {REVENUE_STREAM_LABELS[entry.orderType] || entry.orderType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                              {entry.orderId || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-semibold ${entry.amountCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {entry.amountCents >= 0 ? '+' : ''}{formatCurrency(entry.amountCents)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white truncate max-w-xs">
                              {entry.description || entry.entryType.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(entry.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3 p-4">
                    {filteredEntries.map((entry) => (
                      <div key={entry.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${REVENUE_STREAM_COLORS[entry.orderType] || REVENUE_STREAM_COLORS.unknown}`}>
                            {REVENUE_STREAM_LABELS[entry.orderType] || entry.orderType}
                          </span>
                          <span className={`font-semibold ${entry.amountCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {entry.amountCents >= 0 ? '+' : ''}{formatCurrency(entry.amountCents)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white mb-1">{entry.description || entry.entryType.replace(/_/g, ' ')}</p>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{entry.orderId || '—'}</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
