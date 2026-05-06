'use client';
import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCloudUploadAlt, FaImage, FaTrash } from 'react-icons/fa';
import { uploadToStorage } from '../lib/firebase/helpers';

const POST_TYPES = ['Art', 'Code', 'Game', 'Design', 'Music', 'Other'];

export default function PostEditor({ post, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [existingMediaUrl, setExistingMediaUrl] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState(POST_TYPES[0]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setDescription(post.description || '');
      setLink(post.link || '');
      setType(post.type || POST_TYPES[0]);
      setExistingMediaUrl(post.mediaUrl || '');
      setMediaPreview(post.mediaUrl || '');
    } else {
      setTitle('');
      setDescription('');
      setLink('');
      setType(POST_TYPES[0]);
      setExistingMediaUrl('');
      setMediaPreview('');
    }
    setMediaFile(null);
  }, [post]);

  const handleFileSelect = (file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    setError('');
    setMediaFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    setExistingMediaUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!title) {
      setError('Title is required.');
      return;
    }
    setError('');
    setUploading(true);

    try {
      let mediaUrl = existingMediaUrl || '';
      if (mediaFile) {
        mediaUrl = await uploadToStorage(mediaFile, 'showcase');
      }
      onSave({ title, description, mediaUrl, link, type });
    } catch (err) {
      setError('Failed to upload media: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
          <FaTimes size={20} />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{post ? 'Edit Post' : 'Share Your Work'}</h2>
        
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select 
              id="type" value={type} onChange={(e) => setType(e.target.value)}
              className="block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm p-3 transition-colors"
            >
              {POST_TYPES.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm p-3 transition-colors"
              placeholder="My Amazing Creation"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)}
              className="block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm p-3 transition-colors resize-none"
              placeholder="Tell us about your work..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Media</label>
            {mediaPreview || mediaFile ? (
              <div className="relative rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden">
                {mediaPreview && mediaPreview.startsWith('data:image') || (mediaPreview && mediaPreview.startsWith('http')) ? (
                  <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover" />
                ) : mediaFile ? (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700">
                    <FaImage className="text-blue-500 text-xl" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{mediaFile.name}</span>
                    <span className="text-xs text-gray-500">({(mediaFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <FaCloudUploadAlt className="mx-auto text-3xl text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Images, audio, or video (max 10MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* External Link */}
          <div>
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Link <span className="text-gray-400 text-xs">(optional)</span></label>
            <input
              type="url" id="link" value={link} onChange={(e) => setLink(e.target.value)}
              className="block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm p-3 transition-colors"
              placeholder="https://github.com/user/project"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            disabled={uploading}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={uploading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Uploading...
              </>
            ) : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
