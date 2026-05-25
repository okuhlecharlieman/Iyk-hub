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
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1";

  return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Title <span className="text-red-500">*</span></label>
          <input className={inputClass} placeholder="Enter the opportunity title" name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div>
          <label className={labelClass}>Organization <span className="text-red-500">*</span></label>
          <input className={inputClass} placeholder="Name of the company or organization" name="org" value={form.org} onChange={handleChange} required />
        </div>
        <div>
          <label className={labelClass}>Link <span className="text-red-500">*</span></label>
          <input className={inputClass} placeholder="https://..." name="link" type="url" value={form.link} onChange={handleChange} required />
        </div>
        <div>
          <label className={labelClass}>Short Description <span className="text-red-500">*</span></label>
          <textarea className={inputClass} placeholder="Describe the opportunity" rows={3} name="description" value={form.description} onChange={handleChange} required />
        </div>
        <div>
          <label className={labelClass}>Tags</label>
          <input className={inputClass} placeholder="e.g., tech, volunteering, paid" name="tags" value={form.tags} onChange={handleChange} />
        </div>
        <div>
          <label className={labelClass}>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">If set, this opportunity will automatically be hidden after this date.</p>
        </div>
        
        <FileUploadField
          label="Image / Media (optional)"
          accept="image/*"
          value={mediaFile}
          onChange={setMediaFile}
          previewUrl={form.mediaUrl || ''}
        />
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => { setForm(initialFormState); setMediaFile(null); }}>Reset</Button>
            <Button type="submit" variant="primary" disabled={uploading}>{uploading ? 'Uploading...' : submitButtonText}</Button>
        </div> 
      </form>
  );
}
