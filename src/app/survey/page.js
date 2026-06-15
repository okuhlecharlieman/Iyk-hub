'use client';
/**
 * Page component for /survey.
 */
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaStar, FaPaperPlane } from 'react-icons/fa';
import Button from '../../components/ui/Button';

const SURVEY_QUESTIONS = [
  {
    id: 'overall',
    question: 'How would you rate your overall experience on IYK Hub?',
    type: 'rating',
  },
  {
    id: 'favourite_feature',
    question: 'Which feature do you enjoy most?',
    type: 'choice',
    options: ['Games', 'Showcase / Creativity Wall', 'Leaderboard', 'Opportunities Board', 'Creator Boosts', 'Community / Profiles'],
  },
  {
    id: 'improvement',
    question: 'What would you most like us to improve?',
    type: 'text',
  },
  {
    id: 'recommend',
    question: 'How likely are you to recommend IYK Hub to a friend?',
    type: 'rating',
  },
];

/** SurveyPage — main page component. */
export default function SurveyPage() {
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /** Handles answer action. */
  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  /** Handles submit action. */
  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to submit feedback.');
      return;
    }

    const answered = Object.keys(answers).length;
    if (answered < SURVEY_QUESTIONS.length) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      setSubmitted(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iyk_survey_state', JSON.stringify({ completed: true, completedAt: Date.now() }));
      }
    } catch (err) {
      setError(err.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  /** Handles retake action. */
  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setError('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('iyk_survey_state');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Feedback Survey</h1>
          <p className="text-gray-500 dark:text-gray-400">Please log in to take the survey.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thank you!</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your feedback helps us build a better hub for everyone.</p>
          <Button variant="secondary" onClick={handleRetake}>Take Survey Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback Survey</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Help us improve IYK Hub by sharing your experience</p>
        </div>

        <div className="space-y-6">
          {SURVEY_QUESTIONS.map((q) => (
            <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-3">{q.question}</p>

              {q.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleAnswer(q.id, star)}
                      className={`p-2 rounded-lg transition-colors ${
                        answers[q.id] >= star
                          ? 'text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                      }`}
                    >
                      <FaStar className="text-2xl" />
                    </button>
                  ))}
                  {answers[q.id] && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 self-center">{answers[q.id]}/5</span>
                  )}
                </div>
              )}

              {q.type === 'choice' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(q.id, option)}
                      className={`px-4 py-2 rounded-lg text-sm text-left transition-all border ${
                        answers[q.id] === option
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'text' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            <FaPaperPlane className="mr-2" />
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}
