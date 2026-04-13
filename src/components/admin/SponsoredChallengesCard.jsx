import { useState, useEffect } from 'react';
import { FaTrophy, FaCheck, FaTimes } from 'react-icons/fa';

export default function SponsoredChallengesCard() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/admin/sponsored-challenges');
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveChallenge = async (id) => {
    try {
      const response = await fetch(`/api/admin/sponsored-challenges/${id}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchChallenges(); // Refresh list
      } else {
        alert('Failed to approve challenge');
      }
    } catch (error) {
      console.error('Error approving challenge:', error);
      alert('Error approving challenge');
    }
  };

  const pendingChallenges = challenges.filter(c => c.status === 'pending');

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FaTrophy className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Sponsored Challenges
              </dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">
                {pendingChallenges.length} pending
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : pendingChallenges.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No pending challenges</div>
        ) : (
          <div className="space-y-2">
            {pendingChallenges.slice(0, 3).map((challenge) => (
              <div key={challenge.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {challenge.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {challenge.sponsorName}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => approveChallenge(challenge.id)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    title="Approve"
                  >
                    <FaCheck className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {/* TODO: reject */}}
                    className="inline-flex items-center p-1 border border-transparent rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    title="Reject"
                  >
                    <FaTimes className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {pendingChallenges.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +{pendingChallenges.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}