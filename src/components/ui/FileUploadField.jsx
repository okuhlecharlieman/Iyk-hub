'use client';
import { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaImage, FaTrash } from 'react-icons/fa';

export default function FileUploadField({ label = 'Media', accept = 'image/*,audio/*,video/*', maxSizeMB = 10, value, onChange, previewUrl }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(previewUrl || '');
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }
    setError('');
    onChange(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    onChange(null);
    setPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasFile = value || preview;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {error && <p className="text-red-500 text-xs mb-1">{error}</p>}
      {hasFile ? (
        <div className="relative rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
          ) : value ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700">
              <FaImage className="text-blue-500 text-xl" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{value.name}</span>
              <span className="text-xs text-gray-500">({(value.size / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={removeFile}
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
          className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <FaCloudUploadAlt className="mx-auto text-2xl text-gray-400 dark:text-gray-500 mb-1" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Max {maxSizeMB}MB</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}
