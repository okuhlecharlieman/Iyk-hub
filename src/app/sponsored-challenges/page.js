'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaCalendarAlt, FaTrophy, FaUser } from 'react-icons/fa';

export default function SponsoredChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);

  const fetchChallenges = async (cursor = null) => {
    try {
      const url = cursor ? `/api/sponsored-challenges?cursor=${cursor}` : '/api/sponsored-challenges';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch challenges');
      const data = await response.json();
      setChallenges(prev => cursor ? [...prev, ...data.challenges] : data.challenges);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const loadMore = () => {
    if (nextCursor) {
      fetchChallenges(nextCursor);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Sponsored Challenges
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Compete in sponsored challenges and win prizes while building your skills.
            </p>
          </div>
          <Link
            href="/sponsored-challenges/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaPlus className="mr-2" />
            Create Challenge
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading challenges...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <FaTrophy className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No challenges yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Be the first to create a sponsored challenge!
            </p>
            <div className="mt-6">
              <Link
                href="/sponsored-challenges/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaPlus className="mr-2" />
                Create Challenge
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {challenge.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      challenge.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {challenge.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {challenge.description}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FaCalendarAlt className="mr-2" />
                      Deadline: {new Date(challenge.deadline).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FaTrophy className="mr-2" />
                      {challenge.prizeDescription}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FaUser className="mr-2" />
                      Sponsored by {challenge.sponsorName}
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {challenge.challengeType}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}