import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaDollarSign, FaCreditCard, FaUsers, FaChartLine, FaDownload, FaEye, FaHeart } from 'react-icons/fa';
import { useToast } from '../ui/ToastProvider';

export default function MonetizationDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [processingPayout, setProcessingPayout] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!user) return;
    fetchMonetizationData();
  }, [selectedPeriod, user]);

  const fetchMonetizationData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = user ? await user.getIdToken() : null;
      const response = await fetch(`/api/admin/monetization?period=${selectedPeriod}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Monetization API error:', response.status, errText);
        throw new Error(`API error (${response.status}): ${errText || 'Failed to fetch data'}`);
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Monetization fetch error:', err);
      setError(err.message || 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (challengeId) => {
    setProcessingPayout(challengeId);
    try {
      const response = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payout');
      }

      const result = await response.json();
      toast('success', `Payout processed! Amount: ZAR ${(result.amountCents / 100).toFixed(2)}`);

      // Refresh data
      fetchMonetizationData();
    } catch (err) {
      toast('error', 'Error processing payout: ' + err.message);
    } finally {
      setProcessingPayout(null);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/admin/monetization/export?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `monetization-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast('error', 'Export failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary = {}, recentPayments = [], pendingPayouts = [], revenueByType = [] } = data;
  const safeData = {
    summary: {
      totalRevenueCents: summary.totalRevenueCents ?? 0,
      successfulPayments: summary.successfulPayments ?? 0,
      uniqueCustomers: summary.uniqueCustomers ?? 0,
      averageTransactionCents: summary.averageTransactionCents ?? 0,
      totalDownloads: summary.totalDownloads ?? 0,
      totalDonationRevenueCents: summary.totalDonationRevenueCents ?? 0,
      donationCount: summary.donationCount ?? 0,
      ...summary,
    },
    recentPayments,
    pendingPayouts,
    revenueByType,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monetization Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Track revenue, payments, and payouts</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FaDownload className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaDollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    ZAR {(safeData.summary.totalRevenueCents / 100).toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaCreditCard className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Successful Payments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {safeData.summary.successfulPayments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaUsers className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Paying Customers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {safeData.summary.uniqueCustomers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaChartLine className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg. Transaction
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    ZAR {(safeData.summary.averageTransactionCents / 100).toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaDownload className="h-6 w-6 text-teal-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Downloads
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {safeData.summary.totalDownloads ?? 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaHeart className="h-6 w-6 text-pink-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Donation Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    ZAR {(((safeData.summary.totalDonationRevenueCents ?? 0) / 100).toFixed(2))}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Recent Payments
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {safeData.recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">{payment.orderType}</div>
                        <div className="text-gray-500 dark:text-gray-400">{payment.orderId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ZAR {(payment.amountCents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'succeeded'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : payment.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                        <FaEye className="inline mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Payouts */}
      {safeData.pendingPayouts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Pending Payouts ({safeData.pendingPayouts.length})
            </h3>
            <div className="space-y-4">
              {safeData.pendingPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {payout.sponsorName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Challenge: {payout.challengeTitle}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        ZAR {(payout.amountCents / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Due: {new Date(payout.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => processPayout(payout.challengeId)}
                      disabled={processingPayout === payout.challengeId}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      {processingPayout === payout.challengeId ? 'Processing...' : 'Process Payout'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}