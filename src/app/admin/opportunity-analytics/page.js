/**
 * Admin Opportunity Analytics — shows views, clicks, and CTR for each opportunity.
 * Helps the team understand which opportunities get the most engagement
 * and which ones need improvement.
 */
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { FaEye, FaMousePointer, FaChartBar, FaStar, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

export default function OpportunityAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState({ totalViews: 0, totalClicks: 0, avgCTR: 0, totalOpportunities: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('viewCount');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAnalytics = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/opportunities/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAnalytics(data.analytics || []);
        setSummary(data.summary || {});
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedAnalytics = [...analytics].sort((a, b) => {
    const valA = a[sortField] || 0;
    const valB = b[sortField] || 0;
    return sortAsc ? valA - valB : valB - valA;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortAsc ? <FaSortAmountUp className="inline ml-1 text-xs" /> : <FaSortAmountDown className="inline ml-1 text-xs" />;
  };

  return (
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2.5 text-white shadow-lg">
                  <FaChartBar className="text-xl" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Opportunity Analytics</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Track views, clicks, and engagement for each opportunity.</p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <FaEye /> Total Views
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{summary.totalViews?.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <FaMousePointer /> Total Clicks
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{summary.totalClicks?.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <FaChartBar /> Avg CTR
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{summary.avgCTR}%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <FaStar /> Total Opps
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{summary.totalOpportunities}</p>
              </div>
            </div>

            {/* Analytics table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white">Per-Opportunity Breakdown</h3>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading analytics...</div>
              ) : analytics.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No approved opportunities yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Opportunity</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Org</th>
                        <th
                          className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600"
                          onClick={() => handleSort('viewCount')}
                        >
                          Views <SortIcon field="viewCount" />
                        </th>
                        <th
                          className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600"
                          onClick={() => handleSort('clickCount')}
                        >
                          Clicks <SortIcon field="clickCount" />
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">CTR</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Sponsored</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {sortedAnalytics.map((item) => {
                        const ctr = item.viewCount > 0 ? ((item.clickCount / item.viewCount) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-white max-w-[250px] truncate">{item.title}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.org || '—'}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-white">{item.viewCount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-white">{item.clickCount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-white">{ctr}%</td>
                            <td className="px-4 py-3 text-center">
                              {item.sponsored ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                                  <FaStar className="text-[10px]" /> Yes
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
  );
}
