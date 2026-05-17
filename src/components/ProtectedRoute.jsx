'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { FaExclamationTriangle, FaLock, FaShieldAlt } from 'react-icons/fa';
import Button from './ui/Button';
import { hasAdminDashboardAccess, formatRoleLabel } from '../lib/roles';

const ROLE_PAGE_DESCRIPTIONS = {
  admin: { title: 'Admin Area', icon: FaShieldAlt, description: 'This section is reserved for team members with administrative privileges.', requiredRoles: ['business_owner', 'admin', 'operations', 'developer_support', 'customer_support'] },
  default: { title: 'Restricted Area', icon: FaLock, description: 'You do not have the required permissions to access this page.', requiredRoles: [] },
};

export default function ProtectedRoute({ children, adminOnly = false, requiredRoles = [], pageType = 'default' }) {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted || loading) return;
    if (!user) router.replace('/login');
  }, [isMounted, loading, user, router]);

  if (!isMounted || loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
        <LoadingSpinner />
      </div>
    );
  }

  const userRole = userProfile?.role;
  const isAdminDenied = adminOnly && !hasAdminDashboardAccess(userRole);
  const isRoleDenied = requiredRoles.length > 0 && !requiredRoles.includes(userRole);

  if (isAdminDenied || isRoleDenied) {
    const pageConfig = adminOnly ? ROLE_PAGE_DESCRIPTIONS.admin : ROLE_PAGE_DESCRIPTIONS.default;
    const Icon = pageConfig.icon;
    const allowedRoles = adminOnly ? pageConfig.requiredRoles : requiredRoles;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Icon className="text-3xl text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pageConfig.title}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{pageConfig.description}</p>

          <div className="text-left mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-white">Your Account</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Email: <strong>{user.email}</strong></p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Role: <strong className="text-blue-600 dark:text-blue-400">{formatRoleLabel(userRole) || 'Standard User'}</strong></p>
          </div>

          {allowedRoles.length > 0 && (
            <div className="text-left mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Required Roles</h3>
              <div className="flex flex-wrap gap-2">
                {allowedRoles.map((role) => (
                  <span key={role} className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                    {formatRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <Button onClick={() => router.push('/dashboard')} className="w-full" variant="primary">Go to Dashboard</Button>
            <Button onClick={() => router.back()} className="w-full" variant="secondary">Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
