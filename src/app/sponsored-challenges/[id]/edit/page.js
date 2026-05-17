'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { FaPencilAlt, FaSpinner } from 'react-icons/fa';
import FileUploadField from '../../../../components/ui/FileUploadField';
import { uploadToStorage } from '../../../../lib/firebase/helpers';
import { useToast } from '../../../../components/ui/ToastProvider';

export default function EditSponsoredChallenge({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challengeType: 'general',
    deadline: '',
    prizeDescription: '',
    sponsorName: '',
    sponsorEmail: '',
  });

  useEffect(() => {
    if (!id || !user) return;
    const fetchChallenge = async () => {
      try {
        const docRef = doc(db, 'sponsoredChallenges', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError('Challenge not found');
          return;
        }
        const data = docSnap.data();
        if (data.creatorUid !== user.uid) {
          setError('You can only edit your own challenges');
          return;
        }
        setFormData({
          title: data.title || '',
          description: data.description || '',
          challengeType: data.challengeType || 'general',
          deadline: data.deadline || '',
          prizeDescription: data.prizeDescription || '',
          sponsorName: data.sponsorName || '',
          sponsorEmail: data.sponsorEmail || '',
          bannerUrl: data.bannerUrl || '',
        });
      } catch (err) {
        setError('Failed to load challenge');
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [id, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let bannerUrl = formData.bannerUrl || '';
      if (bannerFile) {
        bannerUrl = await uploadToStorage(bannerFile, 'challenges');
      }

      const docRef = doc(db, 'sponsoredChallenges', id);
      await updateDoc(docRef, {
        title: formData.title,
        description: formData.description,
        challengeType: formData.challengeType,
        deadline: formData.deadline,
        prizeDescription: formData.prizeDescription,
        sponsorName: formData.sponsorName,
        sponsorEmail: formData.sponsorEmail,
        bannerUrl,
        updatedAt: serverTimestamp(),
      });

      toast('success', 'Challenge updated successfully!');
      router.push('/sponsored-challenges/manage');
    } catch (err) {
      setError(err.message || 'Failed to update challenge');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !formData.title) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
            <p className="text-red-500 text-lg">{error}</p>
            <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Go Back
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <FaPencilAlt className="mx-auto h-8 w-8 mb-4" />
            <h1 className="text-4xl font-bold mb-2">Edit Challenge</h1>
            <p className="text-amber-100">Update your sponsored challenge details</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12">
          {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">{error}</div>}

          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input name="title" value={formData.title} onChange={handleChange} required className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="4" required className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Challenge Type</label>
                <select name="challengeType" value={formData.challengeType} onChange={handleChange} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500">
                  <option value="general">General</option>
                  <option value="coding">Coding</option>
                  <option value="design">Design</option>
                  <option value="business">Business</option>
                  <option value="creative">Creative</option>
                  <option value="social_impact">Social Impact</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
                <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prize Description</label>
              <input name="prizeDescription" value={formData.prizeDescription} onChange={handleChange} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sponsor Name</label>
                <input name="sponsorName" value={formData.sponsorName} onChange={handleChange} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sponsor Email</label>
                <input type="email" name="sponsorEmail" value={formData.sponsorEmail} onChange={handleChange} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Image</label>
              {formData.bannerUrl && !bannerFile && (
                <img src={formData.bannerUrl} alt="Current banner" className="mb-3 rounded-lg max-h-40 w-full object-cover" />
              )}
              <FileUploadField label="Upload new banner" accept="image/*" maxSizeMB={10} onChange={(f) => setBannerFile(f)} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                {saving && <FaSpinner className="animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
