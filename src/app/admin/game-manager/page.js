/**
 * Admin Game Manager — manage quiz questions and Word guesser words.
 * Supports adding single items, batch JSON import, and deletion.
 * Data is stored in Firestore under gameContent/{type}/items.
 *
 * JSON format for batch import:
 *   Quiz:    [{ "question": "...", "options": ["A","B","C","D"], "answer": "A", "category": "Science" }]
 *   Word guesser: [{ "word": "example", "category": "General", "hint": "A sample word" }]
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { FaGamepad, FaPlus, FaTrash, FaUpload, FaQuestionCircle, FaFont } from 'react-icons/fa';

const TABS = { QUIZ: 'quiz', WORD_GUESSER: 'word_guesser' };

/** GameManagerPage — main page component. */
export default function GameManagerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.QUIZ);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Single item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [quizForm, setQuizForm] = useState({ question: '', options: ['', '', '', ''], answer: '', category: '' });
  const [wordGuesserForm, setWordGuesserForm] = useState({ word: '', category: '', hint: '' });

  // Batch JSON import
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/game-content?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [user, activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /** Handles add single action. */
  const handleAddSingle = async () => {
    setError('');
    setSuccess('');
    try {
      const token = await user.getIdToken();
      const item = activeTab === TABS.QUIZ
        ? { question: quizForm.question, options: quizForm.options.filter(Boolean), answer: quizForm.answer, category: quizForm.category }
        : { word: wordGuesserForm.word.toLowerCase().trim(), category: wordGuesserForm.category, hint: wordGuesserForm.hint };

      const res = await fetch('/api/admin/game-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: activeTab, item }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setShowAddForm(false);
      setQuizForm({ question: '', options: ['', '', '', ''], answer: '', category: '' });
      setWordGuesserForm({ word: '', category: '', hint: '' });
      fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  /** Handles batch JSON import. */
  const handleJsonImport = async () => {
    setError('');
    setSuccess('');
    try {
      const token = await user.getIdToken();
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
      const res = await fetch('/api/admin/game-content/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: activeTab, items: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setJsonInput('');
      setShowJsonImport(false);
      fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  /** Handles delete action. */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setError('');
    setSuccess('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/game-content/${id}?type=${activeTab}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const tabLabel = activeTab === TABS.QUIZ ? 'Quiz' : 'Word guesser';
  const formTitle = activeTab === TABS.QUIZ ? 'Add Quiz Question' : 'Add Word guesser Word';
  const formFields = activeTab === TABS.QUIZ ? (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
        <textarea
          value={quizForm.question}
          onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Options (4 required)</label>
        <div className="space-y-2">
          {quizForm.options.map((opt, idx) => (
            <input
              key={idx}
              type="text"
              value={opt}
              onChange={(e) => {
                const newOpts = [...quizForm.options];
                newOpts[idx] = e.target.value;
                setQuizForm({ ...quizForm, options: newOpts });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              required
            />
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer (A/B/C/D)</label>
        <select
          value={quizForm.answer}
          onChange={(e) => setQuizForm({ ...quizForm, answer: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select answer</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          type="text"
          value={quizForm.category}
          onChange={(e) => setQuizForm({ ...quizForm, category: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Science, History"
        />
      </div>
    </>
  ) : (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Word</label>
        <input
          type="text"
          value={wordGuesserForm.word}
          onChange={(e) => setWordGuesserForm({ ...wordGuesserForm, word: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., javascript"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          type="text"
          value={wordGuesserForm.category}
          onChange={(e) => setWordGuesserForm({ ...wordGuesserForm, category: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Programming, Animals"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Hint (optional)</label>
        <input
          type="text"
          value={wordGuesserForm.hint}
          onChange={(e) => setWordGuesserForm({ ...wordGuesserForm, hint: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., A popular programming language"
        />
      </div>
    </>
  );

  const batchExample = activeTab === TABS.QUIZ
    ? '[{ "question": "What is 2+2?", "options": ["3", "4", "5", "6"], "answer": "B", "category": "Math" }]'
    : '[{ "word": "example", "category": "General", "hint": "A sample word" }]';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Game Content Manager</h1>
          <p className="mt-2 text-gray-600">Manage Quiz questions and Word guesser words</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex">
            <button
              onClick={() => { setActiveTab(TABS.QUIZ); fetchItems(); }}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === TABS.QUIZ ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FaQuestionCircle className="inline-block w-4 h-4 mr-2" /> Quiz
            </button>
            <button
              onClick={() => { setActiveTab(TABS.WORD_GUESSER); fetchItems(); }}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === TABS.WORD_GUESSER ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FaFont className="inline-block w-4 h-4 mr-2" /> Word guesser
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md" role="alert
          >
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md" role="alert">
            {success}
          </div>
        )}

        {/* Add Single Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900/{tabLabel} Content</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`text-sm font-medium transition-colors ${showAddForm ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            >
              {showAddForm ? 'Cancel' : 'Add Single Item'}
            </button>
          </div>
          {showAddForm && (
            <div className="p-6 space-y-4">
              <h3 className="text-md font-medium text-gray-900/{formTitle}</h3>
              {formFields}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSingle}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Batch Import */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Batch Import</h2>
            <button
              onClick={() => setShowJsonImport(!showJsonImport)}
              className={`text-sm font-medium transition-colors ${showJsonImport ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            >
              {showJsonImport ? 'Cancel' : 'Import JSON'}
            </button>
          </div>
          {showJsonImport && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Paste a JSON array of {tabLabel.toLowerCase()} items.</p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                rows={8}
                placeholder={batchExample}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setShowJsonImport(false); setJsonInput(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJsonImport}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Existing {tabLabel} Items</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">No {tabLabel.toLowerCase()} items yet. Add one above!</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    {activeTab === TABS.QUIZ ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 truncate/{item.question}</p>
                        <p className="text-xs text-gray-500">Category: {item.category || 'Uncategorized'} | Answer: {item.answer}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900 truncate/{item.word}</p>
                        <p className="text-xs text-gray-500">Category: {item.category || 'Uncategorized'} | Hint: {item.hint || 'None'}</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={loading}
                    className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTrash className="inline-block w-3 h-3 mr-1" /> Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}