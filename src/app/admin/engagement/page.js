'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FaChartBar, FaEye, FaClock, FaGamepad, FaUsers, FaArrowUp, FaArrowDown, FaCalendarAlt } from 'react-icons/fa';

export default function EngagementPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [stats, setStats] = useState({
    totalPageViews: 0,
    uniqueUsers: 0,
    avgSessionSeconds: 0,
    topPages: [],
    topEvents: [],
    dailyActivity: [],
    recentEvents: [],
  });

  const fetchEngagementData = useCallback(async () => {
    setLoading(true);
    try {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const engagementRef = collection(db, 'engagement');
      const q = query(engagementRef, where('date', '>=', startDateStr));
      const snapshot = await getDocs(q);

      let totalPageViews = 0;
      let totalSessionSeconds = 0;
      let sessionEntries = 0;
      const uniqueUserIds = new Set();
      const pageViewCounts = {};
      const eventCounts = {};
      const dailyMap = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        uniqueUserIds.add(data.userId);
        totalPageViews += data.totalPageViews || 0;

        if (data.totalSessionSeconds) {
          totalSessionSeconds += data.totalSessionSeconds;
          sessionEntries++;
        }

        if (data.pages) {
          Object.entries(data.pages).forEach(([page, count]) => {
            const pageName = page.replace(/_/g, '/');
            pageViewCounts[pageName] = (pageViewCounts[pageName] || 0) + count;
          });
        }

        if (data.events) {
          Object.entries(data.events).forEach(([event, count]) => {
            eventCounts[event] = (eventCounts[event] || 0) + count;
          });
        }

        const date = data.date;
        if (date) {
          if (!dailyMap[date]) {
            dailyMap[date] = { date, views: 0, users: new Set() };
          }
          dailyMap[date].views += data.totalPageViews || 0;
          dailyMap[date].users.add(data.userId);
        }
      });

      const topPages = Object.entries(pageViewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }));

      const topEvents = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([event, count]) => ({ event, count }));

      const dailyActivity = Object.values(dailyMap)
        .map((d) => ({ date: d.date, views: d.views, users: d.users.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

      let recentEvents = [];
      try {
        const eventsRef = collection(db, 'engagementEvents');
        const eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'), limit(20));
        const eventsSnap = await getDocs(eventsQuery);
        recentEvents = eventsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
        }));
      } catch {
        // engagementEvents collection may not exist yet
      }

      setStats({
        totalPageViews,
        uniqueUsers: uniqueUserIds.size,
        avgSessionSeconds: sessionEntries > 0 ? Math.round(totalSessionSeconds / sessionEntries) : 0,
        topPages,
        topEvents,
        dailyActivity,
        recentEvents,
      });
    } catch (err) {
      console.error('Error fetching engagement data:', err);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const maxViews = Math.max(...(stats.dailyActivity.map((d) => d.views) || [1]), 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaChartBar className="text-blue-500" /> User Engagement
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track how users interact with the platform</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
              <FaEye className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPageViews.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Page Views</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-2">
              <FaUsers className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.uniqueUsers}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active Users</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-100 dark:bg-purple-900/40 rounded-lg p-2">
              <FaClock className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.avgSessionSeconds)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avg Session Duration</p>
        </div>
      </div>

      {/* Daily Activity Chart */}
      {stats.dailyActivity.length > 0 && (
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
          {stats.topPages.length === 0 ? (
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
          {stats.topEvents.length === 0 ? (
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
      {stats.recentEvents.length > 0 && (
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
    </div>
  );
}
