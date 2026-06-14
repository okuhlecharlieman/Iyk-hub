/**
 * Create Sponsored Challenge page — companies create challenges with a budget.
 * Non-admin users must pay via Paystack before the challenge goes live.
 * Admin-created challenges skip payment and are auto-approved.
 */
'use client';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { FaRocket, FaArrowRight } from 'react-icons/fa';
import FileUploadField from '../../../components/ui/FileUploadField';
import { uploadToStorage } from '../../../lib/firebase/helpers';
import { useToast } from '../../../components/ui/ToastProvider';
import PaystackCheckout from '../../../components/PaystackCheckout';
import { ChallengeBenefitsSidebar, ChallengeProcessSteps } from '../../../components/sponsored-challenges/ChallengeBenefitsSidebar';

const inputClass = "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200";

export default function CreateSponsoredChallenge() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '', description: '', challengeType: 'general', deadline: '',
    prizeDescription: '', sponsorName: '', sponsorEmail: '', budget: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [createdChallenge, setCreatedChallenge] = useState(null);
  const toast = useToast();

  const isAdmin = userProfile?.role?.toLowerCase() === 'admin';
  const budgetValue = parseFloat(formData.budget) || 0;
  const platformFee = isAdmin ? 0 : Number((budgetValue * 0.2).toFixed(2));
  const sponsorReceives = Number((budgetValue - platformFee).toFixed(2));

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();
      let bannerUrl = '';
      if (bannerFile) bannerUrl = await uploadToStorage(bannerFile, 'challenges');

      const response = await fetch('/api/sponsored-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, budgetCents: parseInt(formData.budget) * 100, bannerUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create challenge');
      }

      const data = await response.json();

      if (!isAdmin && data.challenge?.id) {
        setCreatedChallenge(data.challenge);
        setShowPayment(true);
        toast('success', 'Challenge created! Complete payment to activate it.');
      } else {
        toast('success', 'Challenge created successfully! It will be reviewed before going live.');
        router.push('/sponsored-challenges');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-3"><FaRocket className="h-8 w-8" /></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Launch Your Challenge</h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Create challenges for any industry—technology, business, marketing, creative arts, nonprofit, or social impact.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ChallengeBenefitsSidebar formData={formData} isAdmin={isAdmin} platformFee={platformFee} sponsorReceives={sponsorReceives} />
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Challenge Details</h2>
                  <p className="text-gray-600 dark:text-gray-400">Fill out the form below to create your sponsored challenge</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Challenge Title *</label>
                      <input type="text" id="title" name="title" required maxLength={100} value={formData.title} onChange={handleChange} className={inputClass} placeholder="e.g., Build a Mobile App for Social Good" />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Challenge Description *</label>
                      <textarea id="description" name="description" required maxLength={1000} rows={5} value={formData.description} onChange={handleChange} className={inputClass} placeholder="Describe the challenge, requirements, judging criteria, and what makes this opportunity special..." />
                    </div>

                    <div>
                      <label htmlFor="challengeType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Challenge Type *</label>
                      <select id="challengeType" name="challengeType" value={formData.challengeType} onChange={handleChange} className={inputClass}>
                        <option value="coding">Coding & Development</option>
                        <option value="design">Design & UX</option>
                        <option value="writing">Writing & Content</option>
                        <option value="marketing">Marketing & Social Media</option>
                        <option value="business">Business & Entrepreneurship</option>
                        <option value="creative">Creative Arts</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Submission Deadline *</label>
                      <input type="datetime-local" id="deadline" name="deadline" required value={formData.deadline} onChange={handleChange} min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} className={inputClass} />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="prizeDescription" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prize Description *</label>
                      <input type="text" id="prizeDescription" name="prizeDescription" required maxLength={200} value={formData.prizeDescription} onChange={handleChange} className={inputClass} placeholder="e.g., $500 cash prize + mentorship opportunity + portfolio feature" />
                    </div>

                    <div>
                      <label htmlFor="sponsorName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Organization Name *</label>
                      <input type="text" id="sponsorName" name="sponsorName" required maxLength={100} value={formData.sponsorName} onChange={handleChange} className={inputClass} placeholder="Your organization or company name" />
                    </div>

                    <div>
                      <label htmlFor="sponsorEmail" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact Email *</label>
                      <input type="email" id="sponsorEmail" name="sponsorEmail" required value={formData.sponsorEmail} onChange={handleChange} className={inputClass} placeholder="contact@yourcompany.com" />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="budget" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Budget (in Rand) *</label>
                      <input type="number" id="budget" name="budget" required min={100} max={10000} value={formData.budget} onChange={handleChange} className={inputClass} placeholder="e.g., 5000 for R5,000" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {isAdmin ? 'No platform fees for admin-created challenges' : `Platform fee: 20% (R${platformFee}) • You pay: R${sponsorReceives}`}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <FileUploadField label="Banner Image (optional)" accept="image/*" value={bannerFile} onChange={setBannerFile} />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    {showPayment && createdChallenge ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-green-800 dark:text-green-200 font-medium">Challenge created! Complete payment to activate it.</p>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">Owner: {createdChallenge.sponsorName} (Company)</p>
                        </div>
                        <PaystackCheckout
                          email={formData.sponsorEmail || user?.email}
                          amountCents={createdChallenge.budgetCents}
                          reference={`challenge-${createdChallenge.id}-${Date.now()}`}
                          metadata={{ orderType: 'sponsoredChallenge', orderId: createdChallenge.id, sponsorName: createdChallenge.sponsorName, ownerType: 'company' }}
                          onSuccess={() => { toast('success', 'Payment successful! Your challenge is now pending review.'); router.push('/sponsored-challenges'); }}
                          onError={(err) => setError(err.message)}
                        />
                        <button type="button" onClick={() => router.push('/sponsored-challenges')} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
                          Pay Later (challenge stays inactive)
                        </button>
                      </div>
                    ) : (
                      <button type="submit" disabled={loading} className="w-full flex justify-center items-center px-8 py-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105">
                        {loading ? (
                          <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>Creating Challenge...</>
                        ) : (
                          <><FaRocket className="mr-3" />{isAdmin ? 'Launch Challenge' : 'Create & Pay'}<FaArrowRight className="ml-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                </form>

                <ChallengeProcessSteps />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
