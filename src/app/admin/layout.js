'use client';
/**
 * Layout wrapper for /app/admin.
 */
import AdminSidebar from '../../components/AdminSidebar';
import ProtectedRoute from '../../components/ProtectedRoute';

/** AdminLayout — layout wrapper component. */
export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute adminOnly>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
