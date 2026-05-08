'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { FaArrowLeft, FaCalendarAlt, FaCheckCircle, FaClock, FaExternalLinkAlt, FaPaperPlane, FaStar, FaTrophy, FaUser, FaHeart, FaListUl } from 'react-icons/fa';

const typeLabels = {
  coding: 'Coding & Development',
  design: 'Design & UX',
  writing: 'Writing & Content',
  marketing: 'Marketing & Social Media',
  business: 'Business & Entrepreneurship',
  creative: 'Creative Arts',
  other: 'Other',
  general: 'General / Open',
};

const formatRand = (cents) => {
  const value = Number(cents || 0) / 100;
  return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function SponsoredChallengeDetail({ params }) {
  const { user, loading, isAdmin } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [ownSubmission, setOwnSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', submissionUrl: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isModerating, setIsModerating] = useState(false);

  const canModerate = useMemo(() => {
    return Boolean(challenge && (isAdmin || user?.uid === challenge.creatorUid));
  }, [challenge, isAdmin, user]);

  const deadlinePassed = useMemo(() => {
    if (!challenge?.deadline) return false;
    return new Date(challenge.deadline) <= new Date();
  }, [challenge]);

  useEffect(() => {
    async function loadChallenge() {
      setErrorMessage('');
      try {
        const res = await fetch(`/api/sponsored-challenges/${params.id}`);
        if (!res.ok) {
          const payload = await res.json();
          throw new Error(payload.error || 'Challenge not found.');
        }
        const payload = await res.json();
        setChallenge(payload.challenge);
      } catch (error) {
        setErrorMessage(error.message);
      }
    }

    loadChallenge();
  }, [params.id]);

  useEffect(() => {
    if (!challenge || loading || !user) return;

    async function loadSubmissions() {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/sponsored-challenges/${params.id}/submissions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const payload = await res.json();
          throw new Error(payload.error || 'Unable to load submissions.');
        }

        const data = await res.json();
        setOwnSubmission(data.ownSubmission);
        setSubmissions(data.submissions || []);
      } catch (error) {
        console.warn('Submission load failed:', error);
      }
    }

    loadSubmissions();
  }, [challenge, loading, params.id, user]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmission = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/sponsored-challenges/${params.id}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit your entry.');
      }

      setOwnSubmission(data.submission);
      setStatusMessage('Submission received. You can update it before the deadline.');
      setFormData({ title: '', description: '', submissionUrl: '' });
      if (canModerate) {
        setSubmissions((prev) => [data.submission, ...prev.filter((item) => item.id !== data.submission.id)]);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeration = async (submissionId, newStatus) => {
    if (!user) return;
    setIsModerating(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/sponsored-challenges/${params.id}/submissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submissionId, status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update submission status.');
      }

      setSubmissions((prev) => prev.map((item) => (item.id === data.submission.id ? data.submission : item)));
      if (ownSubmission?.id === data.submission.id) {
        setOwnSubmission(data.submission);
      }
      setStatusMessage(`Submission updated to ${newStatus}.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsModerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/sponsored-challenges" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-white font-semibold">
            <FaArrowLeft /> Back to challenges
          </Link>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        {!challenge ? (
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-10 text-center">
            <div className="animate-pulse text-xl text-gray-600 dark:text-gray-400">Loading challenge details...</div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-10">
            <div className="space-y-8">
              <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-semibold dark:bg-blue-900 dark:text-blue-200">
                      <FaTrophy className="h-4 w-4" /> {typeLabels[challenge.challengeType] || 'General'}
                    </span>
                    <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{challenge.title}</h1>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">{challenge.description}</p>
                  </div>
                  <div className="rounded-3xl bg-blue-600 text-white p-6 shadow-xl">
                    <div className="text-sm uppercase tracking-[0.24em] text-blue-100">Sponsor</div>
                    <div className="mt-3 text-xl font-semibold">{challenge.sponsorName}</div>
                    <div className="mt-4 text-sm text-blue-100">{challenge.sponsorEmail}</div>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">
                      <FaCalendarAlt /> Deadline
                    </div>
                    <div className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{new Date(challenge.deadline).toLocaleString()}</div>
                  </div>
                  <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">
                      <FaStar /> Budget
                    </div>
                    <div className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{formatRand(challenge.budgetCents)}</div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {challenge.platformFeeWaived ? 'No platform fee for admin-created challenge.' : '20% platform fee applies.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">What to Submit</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Submit a short proposal, prototype link, or case study that clearly explains how your entry meets the sponsor’s brief and prize criteria.</p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start gap-3">
                      <FaListUl className="mt-1 text-blue-500" />
                      Follow the judging criteria in the description.
                    </li>
                    <li className="flex items-start gap-3">
                      <FaExternalLinkAlt className="mt-1 text-blue-500" />
                      Include a demo link, prototype, or supporting document.
                    </li>
                    <li className="flex items-start gap-3">
                      <FaClock className="mt-1 text-blue-500" />
                      Update your submission before the deadline.
                    </li>
                  </ul>
                </div>

                <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-8 border border-dashed border-gray-300 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 font-semibold">Status</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{challenge.status === 'approved' ? 'Open' : 'Pending approval'}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-sm font-semibold ${challenge.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                      {challenge.status === 'approved' ? 'Live' : 'Pending'}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>Created by: {challenge.creatorUid}</p>
                    <p>Prize: {challenge.prizeDescription}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Your Entry</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Participants can upload one response for this challenge. Sponsors and admins can review entries below.</p>
                  </div>
                </div>

                {!user ? (
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 p-6 text-center">
                    <p className="text-gray-700 dark:text-gray-200 mb-4">Sign in to submit your challenge entry and track your status.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <Link href="/login" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Login</Link>
                      <Link href="/signup" className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-blue-600 text-blue-600 bg-white hover:bg-blue-50">Sign up</Link>
                    </div>
                  </div>
                ) : !challenge.status || challenge.status !== 'approved' ? (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30 p-6 text-yellow-900 dark:text-yellow-100">
                    This challenge is not open for submissions yet.
                  </div>
                ) : deadlinePassed ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30 p-6 text-red-900 dark:text-red-100">
                    The submission window has closed.
                  </div>
                ) : (
                  <form onSubmit={handleSubmission} className="space-y-5">
                    {statusMessage && <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-green-900 dark:text-green-100">{statusMessage}</div>}
                    <div>
                      <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Entry Title</label>
                      <input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        maxLength={150}
                        className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Short project title or submission name"
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Submission Summary</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        maxLength={1000}
                        className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe your approach, deliverables, and why this entry deserves the prize."
                      />
                    </div>
                    <div>
                      <label htmlFor="submissionUrl" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Optional Link</label>
                      <input
                        id="submissionUrl"
                        name="submissionUrl"
                        value={formData.submissionUrl}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Project link, prototype, or shared document URL"
                      />
                    </div>
                    <div className="space-y-3">
                      {errorMessage && <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-200">{errorMessage}</div>}
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center justify-center w-full px-6 py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Submitting...' : ownSubmission ? 'Update Submission' : 'Submit Entry'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {ownSubmission && (
                <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-8 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Your Submission</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Track your status and update before the deadline.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold dark:bg-blue-900 dark:text-blue-200">{ownSubmission.status}</span>
                  </div>
                  <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p><span className="font-semibold text-gray-900 dark:text-white">Title:</span> {ownSubmission.title}</p>
                    <p><span className="font-semibold text-gray-900 dark:text-white">Submitted:</span> {new Date(ownSubmission.createdAt).toLocaleString()}</p>
                    {ownSubmission.submissionUrl && (
                      <p>
                        <span className="font-semibold text-gray-900 dark:text-white">Link:</span>{' '}
                        <a href={ownSubmission.submissionUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-300 hover:underline">View submission</a>
                      </p>
                    )}
                    {ownSubmission.score !== null && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Score:</span> {ownSubmission.score}</p>
                    )}
                    {ownSubmission.judgeNotes && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Judge notes:</span> {ownSubmission.judgeNotes}</p>
                    )}
                  </div>
                </div>
              )}

              {canModerate && (
                <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg p-8">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Submissions</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Review and shortlist entries for this challenge.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold dark:bg-green-900 dark:text-green-200">Admin / Sponsor view</span>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-gray-600 dark:text-gray-400">
                      No submissions received yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="rounded-3xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{submission.title}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">by {submission.displayName || 'Anonymous participant'}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold dark:bg-blue-900 dark:text-blue-200">{submission.status}</span>
                              {submission.score !== null && <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold dark:bg-green-900 dark:text-green-200">Score: {submission.score}</span>}
                            </div>
                          </div>
                          <p className="mt-3 text-gray-600 dark:text-gray-300">{submission.description}</p>
                          {submission.submissionUrl && (
                            <p className="mt-3 text-sm text-blue-600 dark:text-blue-300">
                              <a href={submission.submissionUrl} target="_blank" rel="noreferrer" className="hover:underline">View submission link</a>
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={isModerating}
                              onClick={() => handleModeration(submission.id, 'shortlisted')}
                              className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50"
                            >
                              Shortlist
                            </button>
                            <button
                              type="button"
                              disabled={isModerating}
                              onClick={() => handleModeration(submission.id, 'accepted')}
                              className="inline-flex items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-100 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={isModerating}
                              onClick={() => handleModeration(submission.id, 'rejected')}
                              className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
