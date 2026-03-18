'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import { FaFileDownload, FaShieldAlt } from 'react-icons/fa';

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditLogCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs/download?limit=500');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch audit logs');
      }

      downloadJson(`admin-audit-log-${new Date().toISOString()}.json`, json.entries);
    } catch (err) {
      console.error('Failed to download audit logs:', err);
      setError(err.message || 'Failed to download audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Audit Logs</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Download recent admin actions (compliance and review).</p>
        </div>
        <div className="text-blue-600 dark:text-blue-300">
          <FaShieldAlt className="text-3xl" />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button variant="primary" onClick={handleDownload} disabled={loading}>
          {loading ? 'Downloading…' : 'Download audit log'}
        </Button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Contains admin action records; keep the data secure.</p>
    </div>
  );
}
