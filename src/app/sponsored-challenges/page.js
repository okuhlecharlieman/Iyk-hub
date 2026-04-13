'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaCalendarAlt, FaTrophy, FaUser, FaRocket, FaUsers, FaAward, FaStar } from 'react-icons/fa';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                <FaRocket className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Sponsored Challenges
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Launch your next innovation challenge and discover exceptional talent from our global community
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sponsored-challenges/create"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <FaPlus className="mr-3" />
                Create Your Challenge
              </Link>
              <div className="flex items-center justify-center space-x-8 text-blue-100">
                <div className="flex items-center">
                  <FaUsers className="mr-2" />
                  <span>10K+ Participants</span>
                </div>
                <div className="flex items-center">
                  <FaAward className="mr-2" />
                  <span>$2M+ in Prizes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {error && (
          <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">Discovering amazing challenges...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 max-w-2xl mx-auto">
              <FaTrophy className="mx-auto h-16 w-16 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No challenges yet</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Be the first to launch a sponsored challenge and connect with exceptional talent!
              </p>
              <Link
                href="/sponsored-challenges/create"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <FaPlus className="mr-3" />
                Launch Your First Challenge
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Active Challenges
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Discover opportunities to showcase your skills and win amazing prizes
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100 dark:border-gray-700">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        challenge.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {challenge.status === 'approved' ? 'Active' : 'Pending'}
                      </span>
                      <div className="flex items-center">
                        <FaStar className="h-4 w-4 text-yellow-300 mr-1" />
                        <span className="text-sm font-medium">Featured</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">
                      {challenge.title}
                    </h3>
                    <div className="flex items-center text-blue-100 text-sm">
                      <FaUser className="mr-2" />
                      Sponsored by {challenge.sponsorName}
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-3">
                      {challenge.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FaCalendarAlt className="mr-3 text-blue-500" />
                        <span className="font-medium">Deadline:</span>
                        <span className="ml-2">{new Date(challenge.deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FaTrophy className="mr-3 text-purple-500" />
                        <span className="font-medium">Prize:</span>
                        <span className="ml-2">{challenge.prizeDescription}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {challenge.challengeType}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors duration-200">
                        Learn More →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {nextCursor && (
          <div className="mt-16 text-center">
            <button
              onClick={loadMore}
              className="inline-flex items-center px-8 py-4 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              Load More Challenges
            </button>
          </div>
        )}
      </div>
    </div>
  );
}