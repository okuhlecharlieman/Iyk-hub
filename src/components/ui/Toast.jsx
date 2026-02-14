import React from 'react';

export default function Toast({ type = 'success', message, onClose }) {
  const bg = type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100';
  return (
    <div role="status" className={`rounded-md p-3 text-sm shadow ${bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">{message}</div>
        <button onClick={onClose} aria-label="Close notification" className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
      </div>
    </div>
  );
}
