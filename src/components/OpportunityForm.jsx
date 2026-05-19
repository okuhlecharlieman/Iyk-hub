import { useState, useEffect } from 'react';
import Button from './ui/Button';
import FileUploadField from './ui/FileUploadField';
import { uploadToStorage } from '../lib/firebase/helpers';
import { useToast } from './ui/ToastProvider';

export default function OpportunityForm({ onSubmit, initialFormState, submitButtonText }) {
  const [form, setForm] = useState(initialFormState);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setForm(initialFormState);
    setMediaFile(null);
  }, [initialFormState]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let mediaUrl = form.mediaUrl || '';
      if (mediaFile) {
        mediaUrl = await uploadToStorage(mediaFile, 'opportunities');
      }
      onSubmit({ ...form, mediaUrl });
    } catch (err) {
      console.error('Upload error:', err);
      toast('error', 'Failed to upload media: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const inputClass = "w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200";

  return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className={inputClass} placeholder="Title" name="title" value={form.title} onChange={handleChange} required />
        <input className={inputClass} placeholder="Organization" name="org" value={form.org} onChange={handleChange} required />
        <input className={inputClass} placeholder="Link (https://...)" name="link" type="url" value={form.link} onChange={handleChange} required />
        <textarea className={inputClass} placeholder="Short Description" rows={3} name="description" value={form.description} onChange={handleChange} required />
        <input className={inputClass} placeholder="Tags (e.g., tech, volunteering)" name="tags" value={form.tags} onChange={handleChange} />
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Expiry Date (optional)
        </label>
        <input
          className={inputClass}
          type="datetime-local"
          name="expiresAt"
          value={form.expiresAt || ''}
          onChange={handleChange}
          min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">If set, this opportunity will automatically stop appearing publicly after the expiry date.</p>
        <FileUploadField
          label="Image / Media (optional)"
          accept="image/*"
          value={mediaFile}
          onChange={setMediaFile}
          previewUrl={form.mediaUrl || ''}
        />
        <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setForm(initialFormState); setMediaFile(null); }}>Reset</Button>
            <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Uploading...' : submitButtonText}</Button>
        </div> 
      </form>
  );
}
