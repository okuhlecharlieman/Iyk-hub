'use client';
import { FaShieldAlt, FaDownload, FaTrash, FaUndo, FaExclamationTriangle } from 'react-icons/fa';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function AccountManagement({ user, doc, toast }) {
  const handleExport = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast('error', 'Failed to export data'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iyk-hub-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('success', 'Data exported successfully');
    } catch {
      toast('error', 'Failed to export data');
    }
  };

  const handleRestore = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        toast('success', 'Account restored successfully!');
        window.location.reload();
      } else {
        toast('error', json.error || 'Failed to restore account');
      }
    } catch {
      toast('error', 'Failed to restore account');
    }
  };

  const handleDelete = async () => {
    const password = window.prompt('Please enter your password to confirm account deletion:');
    if (!password) return;

    try {
      if (user.providerData?.some(p => p.providerId === 'password')) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }
    } catch {
      toast('error', 'Incorrect password. Please try again.');
      return;
    }

    if (!window.confirm('Your account will be hidden for 30 days before permanent deletion. You can restore it by logging back in during that period. Continue?')) return;

    const wantsExport = window.confirm('Would you like to download a copy of your data before proceeding?');
    if (wantsExport) {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/account/export', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `iyk-hub-data-export.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch {}
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        toast('success', json.message || 'Account scheduled for deletion');
        window.location.reload();
      } else {
        toast('error', json.error || 'Failed to schedule deletion');
      }
    } catch {
      toast('error', 'Failed to schedule account deletion');
    }
  };

  return (
    <>
      <hr className="my-8 border-gray-200 dark:border-gray-600" />
      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FaShieldAlt className="text-gray-400" /> Account &amp; Privacy
        </h3>

        {doc?.accountStatus === 'pending_deletion' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Account scheduled for deletion</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Your account will be permanently removed on {doc?.scheduledPurgeAt ? new Date(doc.scheduledPurgeAt?.toDate ? doc.scheduledPurgeAt.toDate() : doc.scheduledPurgeAt).toLocaleDateString() : '\u2014'}.
                  You can restore your account before then.
                </p>
                <button onClick={handleRestore} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors">
                  <FaUndo className="text-xs" /> Restore Account
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <FaDownload className="text-xs" /> Export My Data
          </button>

          {doc?.accountStatus !== 'pending_deletion' && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
              <FaTrash className="text-xs" /> Remove Account
            </button>
          )}
        </div>
      </div>
    </>
  );
}
