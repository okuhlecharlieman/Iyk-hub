'use client';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function CreateSponsoredChallenge() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challengeType: 'coding',
    deadline: '',
    prizeDescription: '',
    sponsorName: '',
    sponsorEmail: '',
    budgetCents: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sponsored-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budgetCents: parseInt(formData.budgetCents),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create challenge');
      }

      const data = await response.json();
      alert('Challenge created successfully! It will be reviewed by admins before going live.');
      router.push('/sponsored-challenges');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Create Sponsored Challenge
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  maxLength={100}
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Build a Mobile App for Social Good"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  maxLength={1000}
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the challenge, requirements, and judging criteria..."
                />
              </div>

              <div>
                <label htmlFor="challengeType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Challenge Type *
                </label>
                <select
                  id="challengeType"
                  name="challengeType"
                  value={formData.challengeType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="coding">Coding</option>
                  <option value="design">Design</option>
                  <option value="writing">Writing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deadline *
                </label>
                <input
                  type="datetime-local"
                  id="deadline"
                  name="deadline"
                  required
                  value={formData.deadline}
                  onChange={handleChange}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="prizeDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prize Description *
                </label>
                <input
                  type="text"
                  id="prizeDescription"
                  name="prizeDescription"
                  required
                  maxLength={200}
                  value={formData.prizeDescription}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., $500 cash prize + mentorship opportunity"
                />
              </div>

              <div>
                <label htmlFor="sponsorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sponsor Name *
                </label>
                <input
                  type="text"
                  id="sponsorName"
                  name="sponsorName"
                  required
                  maxLength={100}
                  value={formData.sponsorName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Your organization or company name"
                />
              </div>

              <div>
                <label htmlFor="sponsorEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sponsor Email *
                </label>
                <input
                  type="email"
                  id="sponsorEmail"
                  name="sponsorEmail"
                  required
                  value={formData.sponsorEmail}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="contact@yourcompany.com"
                />
              </div>

              <div>
                <label htmlFor="budgetCents" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Budget (in cents) *
                </label>
                <input
                  type="number"
                  id="budgetCents"
                  name="budgetCents"
                  required
                  min={1000}
                  max={100000}
                  value={formData.budgetCents}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 50000 for $500"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Platform fee: 20% (${((parseInt(formData.budgetCents) || 0) * 0.2 / 100).toFixed(2)})
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}</content>
<parameter name="filePath">/workspaces/Iyk-hub/src/app/sponsored-challenges/create/page.js