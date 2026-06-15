'use client';
/**
 * SurveyPopupx component.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';

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

const STORAGE_KEY = 'iyk_survey_state';

/** Fetches/retrieves data — getSurveyState. */
function getSurveyState() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** set Survey State. */
function setSurveyState(state) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** SurveyPopup React component. */
export default function SurveyPopup() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const state = getSurveyState();
    if (state?.completed || state?.dismissed >= 2) return;

    const showCount = state?.showCount || 0;
    const lastShown = state?.lastShown || 0;
    /** hours Since Last. */
    const hoursSinceLast = (Date.now() - lastShown) / (1000 * 60 * 60);

    if (showCount > 0 && hoursSinceLast < 24) return;

    const delay = 10000 + Math.random() * 20000;
    const timer = setTimeout(() => {
      setVisible(true);
      setSurveyState({ ...state, showCount: showCount + 1, lastShown: Date.now() });
    }, delay);

    return () => clearTimeout(timer);
  }, [user]);

  /** Handles dismiss action. */
  const handleDismiss = () => {
    const state = getSurveyState() || {};
    setSurveyState({ ...state, dismissed: (state.dismissed || 0) + 1 });
    setVisible(false);
  };

  /** Handles answer action. */
  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  /** Handles next action. */
  const handleNext = () => {
    if (currentQ < SURVEY_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    }
  };

  /** Handles submit action. */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      await fetch('/api/survey/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });
      setSurveyState({ completed: true, completedAt: Date.now() });
      setSubmitted(true);
    } catch (err) {
      console.error('Survey submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !user) return null;

  const q = SURVEY_QUESTIONS[currentQ];
  const isLast = currentQ === SURVEY_QUESTIONS.length - 1;
  const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== '';

  if (submitted) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thank you!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your feedback helps us build a better hub for everyone.</p>
          <button onClick={() => setVisible(false)} className="mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm">Quick Feedback</h3>
          <p className="text-xs opacity-80">{currentQ + 1} of {SURVEY_QUESTIONS.length}</p>
        </div>
        <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <FaTimes className="text-sm" />
        </button>
      </div>

      <div className="p-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">{q.question}</p>

        {q.type === 'rating' && (
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleAnswer(q.id, star)}
                className={`text-2xl transition-transform hover:scale-110 ${
                  answers[q.id] >= star ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        )}

        {q.type === 'choice' && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(q.id, opt)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  answers[q.id] === opt
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === 'text' && (
          <textarea
            value={answers[q.id] || ''}
            onChange={(e) => handleAnswer(q.id, e.target.value)}
            placeholder="Your thoughts..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
        )}

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Skip survey
          </button>
          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={!hasAnswer || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPaperPlane className="text-xs" />
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!hasAnswer}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
          style={{ width: `${((currentQ + 1) / SURVEY_QUESTIONS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
