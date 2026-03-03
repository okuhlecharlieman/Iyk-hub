'use client';
import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const POST_TYPES = ['Art', 'Code', 'Game', 'Design', 'Music', 'Other'];

// A reusable modal form for creating and editing showcase posts.
export default function PostEditor({ post, onSave, onClose }) {
  // State for all editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState(POST_TYPES[0]); // Default to the first type
  const [error, setError] = useState('');

  // If we are editing an existing post, populate the form fields
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setDescription(post.description || '');
      setMediaUrl(post.mediaUrl || '');
      setLink(post.link || '');
      setType(post.type || POST_TYPES[0]);
    } else {
      // Reset form when creating a new post
      setTitle('');
      setDescription('');
      setMediaUrl('');
      setLink('');
      setType(POST_TYPES[0]);
    }
  }, [post]);

  const handleSave = () => {
    if (!title) {
      setError('Title is required.');
      return;
    }
    // Pass all editable fields to the onSave handler
    onSave({ title, description, mediaUrl, link, type });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 relative overflow-y-auto max-h-full">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white">
          <FaTimes size={24} />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{post ? 'Edit Post' : 'Create Post'}</h2>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input
              type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
              placeholder="My Amazing Creation"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              id="description" rows="4" value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
              placeholder="A short description of your work..."
            ></textarea>
          </div>

          {/* Media URL */}
          <div>
            <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Media URL (Image or Video)</label>
            <input
              type="text" id="mediaUrl" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
              placeholder="https://example.com/image.png"
            />
          </div>

          {/* External Link */}
          <div>
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300">External Link (e.g., GitHub, Portfolio)</label>
            <input
              type="text" id="link" value={link} onChange={(e) => setLink(e.target.value)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
              placeholder="https://github.com/user/project"
            />
          </div>

          {/* Post Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select 
              id="type" value={type} onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
            >
              {POST_TYPES.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
            </select>
          </div>

        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
