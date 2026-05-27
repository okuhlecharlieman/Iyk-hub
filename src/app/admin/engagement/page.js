'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  FaChartBar, FaEye, FaClock, FaGamepad, FaUsers, FaArrowUp, FaArrowDown,
  FaCalendarAlt, FaLightbulb, FaExclamationTriangle, FaCheckCircle, FaInfoCircle,
  FaChartPie, FaRoute, FaRocket,
} from 'react-icons/fa';

export default function EngagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [stats, setStats] = useState(null);

  const fetchEngagementData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/engagement?days=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error('Error fetching engagement data:', err);
    }
    setLoading(false);
  }, [period, user]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const TrendBadge = ({ value }) => {
    if (value === null || value === undefined) return null;
    const isUp = value >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
        {isUp ? <FaArrowUp className="text-[10px]" /> : <FaArrowDown className="text-[10px]" />}
        {Math.abs(value)}%
      </span>
    );
  };

  const InsightIcon = ({ type }) => {
    switch (type) {
      case 'critical': return <FaExclamationTriangle className="text-red-500 text-lg flex-shrink-0" />;
      case 'warning': return <FaExclamationTriangle className="text-amber-500 text-lg flex-shrink-0" />;
      case 'success': return <FaCheckCircle className="text-green-500 text-lg flex-shrink-0" />;
      default: return <FaInfoCircle className="text-blue-500 text-lg flex-shrink-0" />;
    }
  };

  const insightBorder = (type) => {
    switch (type) {
      case 'critical': return 'border-l-4 border-l-red-500';
      case 'warning': return 'border-l-4 border-l-amber-500';
      case 'success': return 'border-l-4 border-l-green-500';
      default: return 'border-l-4 border-l-blue-500';
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const maxViews = Math.max(...(stats.dailyActivity?.map((d) => d.views) || [1]), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaChartBar className="text-blue-500" /> Engagement & Insights
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Actionable data to guide app direction</p>
        </div>
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Actionable Insights */}
      {stats.insights && stats.insights.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-indigo-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaLightbulb className="text-amber-500" /> Recommendations & Insights
          </h3>
          <div className="space-y-3">
            {stats.insights
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2, success: 3 };
                return (order[a.type] ?? 4) - (order[b.type] ?? 4);
              })
              .map((insight, i) => (
                <div key={i} className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${insightBorder(insight.type)}`}>
                  <div className="flex items-start gap-3">
                    <InsightIcon type={insight.type} />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{insight.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Summary Cards with Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
              <FaEye className="text-blue-600 dark:text-blue-400" />
            </div>
            <TrendBadge value={stats.trends?.pageViewsChange} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{(stats.totalPageViews || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Page Views</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-2">
              <FaUsers className="text-green-600 dark:text-green-400" />
            </div>
            <TrendBadge value={stats.trends?.usersChange} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.uniqueUsers || 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active Users</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-100 dark:bg-purple-900/40 rounded-lg p-2">
              <FaClock className="text-purple-600 dark:text-purple-400" />
            </div>
            <TrendBadge value={stats.trends?.sessionChange} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.avgSessionSeconds)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avg Session Duration</p>
        </div>
      </div>

      {/* Feature Adoption */}
      {stats.featureAdoption && Object.keys(stats.featureAdoption).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaChartPie className="text-indigo-500" /> Feature Adoption
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">What percentage of active users visited each feature</p>
          <div className="space-y-3">
            {Object.entries(stats.featureAdoption)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .map(([feature, data]) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">{feature}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${data.percentage > 50 ? 'bg-green-500' : data.percentage > 20 ? 'bg-blue-500' : data.percentage > 0 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      style={{ width: `${Math.max(data.percentage, 2)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400 w-16 text-right">{data.percentage}%</span>
                  <span className="text-xs text-gray-400 w-20 text-right">{data.users} users</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* User Flow / Drop-off */}
      {stats.dropOff && stats.dropOff.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaRoute className="text-orange-500" /> Page Traffic Funnel
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Shows relative traffic — where users go and where they drop off</p>
          <div className="space-y-2">
            {stats.dropOff.map((item, i) => (
              <div key={item.page} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-36 truncate">{item.page || '/home'}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                    style={{ width: `${item.retentionPct}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-gray-500 w-14 text-right">{item.views.toLocaleString()}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{item.retentionPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Activity Chart */}
      {stats.dailyActivity && stats.dailyActivity.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Daily Activity</h3>
          <div className="flex items-end gap-1 h-40">
            {stats.dailyActivity.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="hidden group-hover:block absolute -top-12 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {day.date}: {day.views} views, {day.users} users
                </div>
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                  style={{ height: `${Math.max((day.views / maxViews) * 100, 4)}%` }}
                ></div>
                <span className="text-[10px] text-gray-400 truncate w-full text-center">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaEye className="text-blue-500" /> Top Pages
          </h3>
          {!stats.topPages || stats.topPages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topPages.map((item, i) => (
                <div key={item.page} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.page || '/home'}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Events */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaGamepad className="text-green-500" /> Top Events
          </h3>
          {!stats.topEvents || stats.topEvents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No events tracked yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topEvents.map((item, i) => (
                <div key={item.event} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.event}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Events */}
      {stats.recentEvents && stats.recentEvents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Recent Events</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Event</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">User</th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.map((evt) => (
                  <tr key={evt.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{evt.eventType}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{evt.userId?.slice(0, 8)}...</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Plan */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-purple-200 dark:border-gray-700 p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <FaRocket className="text-purple-500" /> What To Do Next
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {stats.insights && stats.insights.filter(i => i.priority === 'high').length > 0 ? (
            stats.insights.filter(i => i.priority === 'high').map((insight, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-800 dark:text-gray-200">{insight.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{insight.description.split('.')[0]}.</p>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-gray-500 dark:text-gray-400 py-4">
              No urgent actions needed right now. Keep monitoring!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
