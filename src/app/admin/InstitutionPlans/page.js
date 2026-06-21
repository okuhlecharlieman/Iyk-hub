'use client';
/**
 * Page component for /admin/InstitutionPlans.
 */
import ProtectedRoute from '../../../components/ProtectedRoute';
import { FaBuilding } from 'react-icons/fa';

/** InstitutionPlansPage — main page component. */
export default function InstitutionPlansPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-16">
        <div className="max-w-4xl mx-auto rounded-3xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
            <FaBuilding className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Institution Plans</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            This page is coming soon. We are building institution-level plans and billing management for your organization.
          </p>
          <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <p>Plan details, pricing tiers, and institution controls will be available here.</p>
            <p>Admins can manage company accounts, subscriptions, and special partnerships from this panel.</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
