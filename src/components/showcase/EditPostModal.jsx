import { useState, useEffect } from 'react';
import Modal from '../Modal';
import LoadingSpinner from '../LoadingSpinner';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';

export default function EditPostModal({ post, isOpen, onClose, onUpdate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setDescription(post.description || '');
    }
  }, [post]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onUpdate(post.id, { title, description });
      onClose();
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!post) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title="Edit Post">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition"
          ></textarea>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
           <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading} variant="primary">{isLoading ? <LoadingSpinner size="sm" /> : 'Update Post'}</Button>
        </div> 
      </form>
    </Modal>
  );
}
