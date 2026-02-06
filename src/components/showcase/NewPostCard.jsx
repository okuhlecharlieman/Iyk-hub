
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createShowcasePost } from '../../lib/firebaseHelpers';

export default function NewPostCard({ onPostCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Title and description are required.');
      return;
    }
    if (!user) {
      setError('You must be logged in to post.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createShowcasePost({
        title,
        description,
        uid: user.uid,
      });
      setTitle('');
      setDescription('');
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      setError('Failed to create post. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
      <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Create a New Showcase</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="My Awesome Project"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="A short description of what makes your project special."
          />
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-blue-300"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  );
}
