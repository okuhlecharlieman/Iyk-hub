import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createShowcasePost } from '../../lib/firebase/helpers';
import Modal from '../Modal';
import LoadingSpinner from '../LoadingSpinner';

export default function NewPostModal({ isOpen, onClose, onPostCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('art');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !type) {
      setError('Type, title and description are required.');
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
        link,
        type,
        uid: user.uid,
      }, media);
      
      // Reset form and close modal
      setTitle('');
      setDescription('');
      setLink('');
      setMedia(null);
      setType('art');
      onClose();
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred.';
      setError(`Failed to create post: ${errorMessage}`);
      console.error("Error creating showcase post:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Share Your Work">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type of Work</label>
            <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition"
            >
                <option value="art">Art</option>
                <option value="code">Code</option>
                <option value="music">Music</option>
            </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="My Awesome Project"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            id="description"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="A short description of what makes it special."
          />
        </div>

        <div>
          <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link (Optional)</label>
          <input
            type="url"
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="https://github.com/my-project"
          />
        </div>

        <div>
          <label htmlFor="media" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Media (Optional)</label>
          <input
            type="file"
            id="media"
            onChange={(e) => setMedia(e.target.files[0])}
            className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200/70 dark:hover:file:bg-blue-900 transition"
          />
           <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Upload an image for art, or an audio file for music.</p>
        </div>

        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        
        <div className="flex justify-end pt-4 space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary py-2 px-4 rounded-lg flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Post'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
