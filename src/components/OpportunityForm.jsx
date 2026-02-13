import { useState, useEffect } from 'react';

export default function OpportunityForm({ onSubmit, initialFormState, submitButtonText }) {
  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    setForm(initialFormState);
  }, [initialFormState]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200" placeholder="Title" name="title" value={form.title} onChange={handleChange} required />
        <input className="w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200" placeholder="Organization" name="org" value={form.org} onChange={handleChange} required />
        <input className="w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200" placeholder="Link (https://...)" name="link" type="url" value={form.link} onChange={handleChange} required />
        <textarea className="w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200" placeholder="Short Description" rows={3} name="description" value={form.description} onChange={handleChange} required />
        <input className="w-full text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition duration-200" placeholder="Tags (e.g., tech, volunteering)" name="tags" value={form.tags} onChange={handleChange} />
        <div className="flex justify-end space-x-3 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setForm(initialFormState)}>Reset</button>
            <button type="submit" className="btn-primary">{submitButtonText}</button>
        </div>
      </form>
  );
}
