/**
 * Admin Game Manager — manage quiz questions and hangman words.
 * Supports adding single items, batch JSON import, and deletion.
 * Data is stored in Firestore under gameContent/{type}/items.
 *
 * JSON format for batch import:
 *   Quiz:    [{ "question": "...", "options": ["A","B","C","D"], "answer": "A", "category": "Science" }]
 *   Hangman: [{ "word": "example", "category": "General", "hint": "A sample word" }]
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { FaGamepad, FaPlus, FaTrash, FaUpload, FaQuestionCircle, FaFont } from 'react-icons/fa';

const TABS = { QUIZ: 'quiz', HANGMAN: 'hangman' };

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
  const [hangmanForm, setHangmanForm] = useState({ word: '', category: '', hint: '' });

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

  const handleAddSingle = async () => {
    setError('');
    setSuccess('');
    try {
      const token = await user.getIdToken();
      const item = activeTab === TABS.QUIZ
        ? { question: quizForm.question, options: quizForm.options.filter(Boolean), answer: quizForm.answer, category: quizForm.category }
        : { word: hangmanForm.word.toLowerCase().trim(), category: hangmanForm.category, hint: hangmanForm.hint };

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
      setHangmanForm({ word: '', category: '', hint: '' });
      fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBatchImport = async () => {
    setError('');
    setSuccess('');
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('JSON must be a non-empty array.');
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch('/api/admin/game-content', {
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
      setError(err.message === 'Unexpected token' ? 'Invalid JSON format' : err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/game-content?type=${activeTab}&id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSuccess('Item deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass = 'w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-xl p-2.5 text-white shadow-lg">
                  <FaGamepad className="text-xl" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Game Manager</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Manage quiz questions and hangman words. Add individually or batch import via JSON.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setActiveTab(TABS.QUIZ); setShowAddForm(false); setShowJsonImport(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === TABS.QUIZ ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <FaQuestionCircle /> Quiz Questions
              </button>
              <button
                onClick={() => { setActiveTab(TABS.HANGMAN); setShowAddForm(false); setShowJsonImport(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === TABS.HANGMAN ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <FaFont /> Hangman Words
              </button>
            </div>

            {/* Alerts */}
            {error && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{success}</div>}

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <button onClick={() => { setShowAddForm(!showAddForm); setShowJsonImport(false); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <FaPlus /> Add {activeTab === TABS.QUIZ ? 'Question' : 'Word'}
              </button>
              <button onClick={() => { setShowJsonImport(!showJsonImport); setShowAddForm(false); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                <FaUpload /> Batch Import JSON
              </button>
            </div>

            {/* Single add form */}
            {showAddForm && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  Add {activeTab === TABS.QUIZ ? 'Quiz Question' : 'Hangman Word'}
                </h3>
                {activeTab === TABS.QUIZ ? (
                  <div className="space-y-3">
                    <input className={inputClass} placeholder="Question" value={quizForm.question} onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })} />
                    {quizForm.options.map((opt, i) => (
                      <input key={i} className={inputClass} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const o = [...quizForm.options]; o[i] = e.target.value; setQuizForm({ ...quizForm, options: o }); }} />
                    ))}
                    <input className={inputClass} placeholder="Correct answer (must match an option exactly)" value={quizForm.answer} onChange={(e) => setQuizForm({ ...quizForm, answer: e.target.value })} />
                    <input className={inputClass} placeholder="Category (e.g., Science, History)" value={quizForm.category} onChange={(e) => setQuizForm({ ...quizForm, category: e.target.value })} />
                    <button onClick={handleAddSingle} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Add Question</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input className={inputClass} placeholder="Word" value={hangmanForm.word} onChange={(e) => setHangmanForm({ ...hangmanForm, word: e.target.value })} />
                    <input className={inputClass} placeholder="Category (e.g., Animals, Technology)" value={hangmanForm.category} onChange={(e) => setHangmanForm({ ...hangmanForm, category: e.target.value })} />
                    <input className={inputClass} placeholder="Hint (optional)" value={hangmanForm.hint} onChange={(e) => setHangmanForm({ ...hangmanForm, hint: e.target.value })} />
                    <button onClick={handleAddSingle} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">Add Word</button>
                  </div>
                )}
              </div>
            )}

            {/* Batch JSON import */}
            {showJsonImport && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Batch Import via JSON</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {activeTab === TABS.QUIZ
                    ? 'Format: [{ "question": "...", "options": ["A","B","C","D"], "answer": "A", "category": "Science" }]'
                    : 'Format: [{ "word": "example", "category": "General", "hint": "A sample word" }]'}
                </p>
                <textarea
                  className={`${inputClass} h-40 font-mono text-xs`}
                  placeholder="Paste JSON array here..."
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
                <button onClick={handleBatchImport} className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                  Import
                </button>
              </div>
            )}

            {/* Items list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white">
                  {activeTab === TABS.QUIZ ? 'Quiz Questions' : 'Hangman Words'} ({items.length})
                </h3>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No items yet. Add some or import via JSON. Default built-in content will be used until you add custom items.
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        {activeTab === TABS.QUIZ ? (
                          <>
                            <p className="font-medium text-gray-800 dark:text-white text-sm">{item.question}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Options: {item.options?.join(' | ')} — Answer: <span className="font-semibold text-green-600">{item.answer}</span>
                            </p>
                            {item.category && <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">{item.category}</span>}
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-800 dark:text-white text-sm">{item.word}</p>
                            {item.hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hint: {item.hint}</p>}
                            {item.category && <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">{item.category}</span>}
                          </>
                        )}
                      </div>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0" title="Delete">
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
  );
}
