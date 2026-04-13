'use client';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { FaRocket, FaTrophy, FaUsers, FaLightbulb, FaCheckCircle, FaArrowRight } from 'react-icons/fa';

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

  const platformFee = ((parseInt(formData.budgetCents) || 0) * 0.2 / 100).toFixed(2);
  const sponsorReceives = ((parseInt(formData.budgetCents) || 0) * 0.8 / 100).toFixed(2);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                  <FaRocket className="h-8 w-8" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Launch Your Challenge
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Connect with exceptional talent and drive innovation in your industry
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Benefits Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Why Choose Intwana Hub?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 mr-3">
                      <FaUsers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Global Talent Pool</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Access 10,000+ skilled developers worldwide</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-2 mr-3">
                      <FaTrophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Quality Submissions</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rigorous review process ensures high-quality entries</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 dark:bg-green-900 rounded-full p-2 mr-3">
                      <FaLightbulb className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Innovation Focus</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Discover breakthrough solutions and fresh perspectives</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Preview */}
                {formData.budgetCents && (
                  <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Budget:</span>
                        <span className="font-medium">${(parseInt(formData.budgetCents) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Platform Fee (20%):</span>
                        <span className="font-medium text-red-600">-${platformFee}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold text-gray-900 dark:text-white">You Pay:</span>
                        <span className="font-bold text-green-600">${sponsorReceives}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Challenge Details
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Fill out the form below to create your sponsored challenge
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="e.g., Build a Mobile App for Social Good"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Challenge Description *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        required
                        maxLength={1000}
                        rows={5}
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Describe the challenge, requirements, judging criteria, and what makes this opportunity special..."
                      />
                    </div>

                    <div>
                      <label htmlFor="challengeType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Challenge Type *
                      </label>
                      <select
                        id="challengeType"
                        name="challengeType"
                        value={formData.challengeType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                      >
                        <option value="coding">Coding & Development</option>
                        <option value="design">Design & UX</option>
                        <option value="writing">Writing & Content</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Submission Deadline *
                      </label>
                      <input
                        type="datetime-local"
                        id="deadline"
                        name="deadline"
                        required
                        value={formData.deadline}
                        onChange={handleChange}
                        min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="prizeDescription" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="e.g., $500 cash prize + mentorship opportunity + portfolio feature"
                      />
                    </div>

                    <div>
                      <label htmlFor="sponsorName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        id="sponsorName"
                        name="sponsorName"
                        required
                        maxLength={100}
                        value={formData.sponsorName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Your organization or company name"
                      />
                    </div>

                    <div>
                      <label htmlFor="sponsorEmail" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        id="sponsorEmail"
                        name="sponsorEmail"
                        required
                        value={formData.sponsorEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="contact@yourcompany.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="budgetCents" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="e.g., 50000 for $500"
                      />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Platform fee: 20% (${platformFee}) • You pay: ${sponsorReceives}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center px-8 py-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Creating Challenge...
                        </>
                      ) : (
                        <>
                          <FaRocket className="mr-3" />
                          Launch Challenge
                          <FaArrowRight className="ml-3" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Process Steps */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    What happens next?
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Review</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Our team reviews your challenge within 24 hours</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                        <span className="text-purple-600 dark:text-purple-400 font-bold">2</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Launch</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Approved challenges go live immediately</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                        <span className="text-green-600 dark:text-green-400 font-bold">3</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Results</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive submissions and select winners</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}