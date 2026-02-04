import { useState } from 'react';

export default function OpportunityForm({ onSubmit, initialFormState, submitButtonText, title }) {
  const [form, setForm] = useState(initialFormState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm(initialFormState); // Reset form after submission
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition" placeholder="Title" name="title" value={form.title} onChange={handleChange} required />
        <input className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition" placeholder="Organization" name="org" value={form.org} onChange={handleChange} required />
        <input className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition" placeholder="Link (https://...)" name="link" type="url" value={form.link} onChange={handleChange} required />
        <textarea className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition" placeholder="Short Description" rows={3} name="description" value={form.description} onChange={handleChange} required />
        <input className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition" placeholder="Tags (e.g., tech, volunteering)" name="tags" value={form.tags} onChange={handleChange} />
        <button className="w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg py-3 font-semibold hover:from-blue-600 hover:to-teal-500 transition-transform transform hover:scale-105 shadow-md">{submitButtonText}</button>
      </form>
    </div>
  );
}
