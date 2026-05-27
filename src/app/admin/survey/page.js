'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useAuth } from '../../../context/AuthContext';
import { FaSync, FaStar, FaChartBar } from 'react-icons/fa';
import Button from '../../../components/ui/Button';

const QUESTION_LABELS = {
  overall: 'Overall Experience',
  favourite_feature: 'Favourite Feature',
  improvement: 'Improvement Suggestion',
  recommend: 'Recommend to Friend',
};

export default function AdminSurveyPage() {
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResponses = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/survey', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch survey responses');
      setResponses(data.responses || []);
    } catch (err) {
      setError(err.message);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const averageRating = (questionId) => {
    const ratings = responses.map((r) => r.answers?.[questionId]).filter((v) => typeof v === 'number');
    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const featureBreakdown = () => {
    const counts = {};
    responses.forEach((r) => {
      const val = r.answers?.favourite_feature;
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner />
        </div>
      </ProtectedRoute>
    );
  }

  const avgOverall = averageRating('overall');
  const avgRecommend = averageRating('recommend');
  const features = featureBreakdown();

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Survey Responses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{responses.length} total responses</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchResponses} disabled={loading}>
            <FaSync className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaChartBar className="text-blue-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{responses.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Responses</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaStar className="text-yellow-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgOverall || 'N/A'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Overall Rating</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <FaStar className="text-purple-500 text-xl" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgRecommend || 'N/A'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Recommend Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Breakdown */}
        {features.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Favourite Feature Breakdown</h2>
            <div className="space-y-2">
              {features.map(([feature, count]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / responses.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Responses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Responses</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {responses.length > 0 ? responses.map((response) => (
              <div key={response.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">User: {response.uid?.slice(0, 8)}...</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {response.createdAt ? new Date(response.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(response.answers || {}).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{QUESTION_LABELS[key] || key}: </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {typeof value === 'number' ? `${value}/5` : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="p-12 text-center">
                <FaChartBar className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No survey responses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
