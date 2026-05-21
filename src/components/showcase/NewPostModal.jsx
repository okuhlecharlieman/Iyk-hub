import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createShowcasePost } from '../../lib/firebase/helpers';
import Modal from '../Modal';
import Button from '../ui/Button';
import FileUploadField from '../ui/FileUploadField';
import { useToast } from '../ui/ToastProvider';

export default function NewPostModal({ isOpen, onClose, onPostCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('art');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

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
      const newPost = await createShowcasePost({
        title,
        description,
        link,
        type,
      }, media);
      
      toast('success', 'Post created successfully!');
      setTitle('');
      setDescription('');
      setLink('');
      setMedia(null);
      setType('art');
      onClose();
      if (onPostCreated) {
        onPostCreated(newPost);
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred.';
      setError(`Failed to create post: ${errorMessage}`);
      toast('error', `Failed to create post: ${errorMessage}`);
      console.error("Error creating showcase post:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200";

  return (
    <Modal open={isOpen} onClose={onClose} title="Share Your Work">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Type of Work <span className="text-red-500">*</span></label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value)}
            className={inputClass}
            required
          >
            <option value="art">Art</option>
            <option value="code">Code</option>
            <option value="music">Music</option>
            <option value="game">Game</option>
            <option value="design">Design</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
          <input
            className={inputClass}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={150}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
          <textarea
            rows={3}
            className={inputClass}
            placeholder="Short description of what makes it special."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={2000}
          />
        </div>

        <input
          type="url"
          className={inputClass}
          placeholder="Link (https://...)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <FileUploadField
          label="Image / Media (optional)"
          accept="image/*,audio/*"
          value={media}
          onChange={setMedia}
        />

        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading} variant="primary">{loading ? 'Posting...' : 'Post'}</Button>
        </div> 
      </form>
    </Modal>
  );
}
