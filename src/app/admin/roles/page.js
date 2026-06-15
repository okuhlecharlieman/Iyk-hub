'use client';
/**
 * Page component for /admin/roles.
 */
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { canManageTeam, PERMISSIONS, ROLE_DEFINITIONS, TEAM_MANAGEMENT_ROLES, formatRoleLabel } from '../../../lib/roles';
import { FaBriefcase, FaCheckCircle, FaCode, FaCrown, FaHandshake, FaHeadset, FaLock, FaMoneyBillWave, FaUsers } from 'react-icons/fa';

const permissionLabels = {
  [PERMISSIONS.MANAGE_TEAM]: 'Invite and manage teammates',
  [PERMISSIONS.MANAGE_MONEY]: 'Manage payouts and money movement',
  [PERMISSIONS.MANAGE_OPERATIONS]: 'Run operations and workflows',
  [PERMISSIONS.MANAGE_CONTENT]: 'Manage content, challenges, and opportunities',
  [PERMISSIONS.HANDLE_TECHNICAL_SUPPORT]: 'Provide developer support',
  [PERMISSIONS.HANDLE_CUSTOMER_SUPPORT]: 'Provide customer support',
  [PERMISSIONS.VIEW_CLIENT_WORKSPACE]: 'View client workspace and project context',
};

const roleIcons = {
  business_owner: <FaCrown />,
  admin: <FaUsers />,
  operations: <FaBriefcase />,
  developer_support: <FaCode />,
  customer_support: <FaHeadset />,
  client: <FaHandshake />,
  user: <FaLock />,
};

const colorClasses = {
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/60',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/60',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/60',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/60',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/60',
  pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/60',
  slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
};

/** AdminRolesPage — main page component. */
export default function AdminRolesPage() {
  const { userProfile } = useAuth();
  const currentRole = userProfile?.role;
  const canManage = canManageTeam(currentRole);

  if (!canManage) {
    return (
      <ProtectedRoute adminOnly>
        <div className="max-w-3xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100">
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="mt-2 text-sm">Your current role is {formatRoleLabel(currentRole)}. Only {TEAM_MANAGEMENT_ROLES.map(formatRoleLabel).join(', ')} can manage teammates and roles.</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white shadow-xl shadow-blue-500/20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Team workspace</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Roles & Permissions</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              Use these Paystack-style roles to run IYK Hub like a business: leadership keeps control, operations runs the workflow, support teams help users, and clients get a focused workspace.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <FaCrown className="text-2xl text-purple-500" />
            <h2 className="mt-3 font-bold text-gray-900 dark:text-white">Business control</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Business Owner and Admin roles have full control, including team setup and financial actions.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <FaBriefcase className="text-2xl text-emerald-500" />
            <h2 className="mt-3 font-bold text-gray-900 dark:text-white">Internal operations</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Operations can manage workflows and teammates while keeping money movement restricted.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <FaHandshake className="text-2xl text-pink-500" />
            <h2 className="mt-3 font-bold text-gray-900 dark:text-white">Client access</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Client roles separate external sponsors, institutions, and paying customers from internal staff.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {ROLE_DEFINITIONS.map((role) => (
            <article key={role.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl border p-3 text-xl ${colorClasses[role.color] || colorClasses.slate}`}>
                    {roleIcons[role.key] || <FaUsers />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{role.label}</h2>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{role.category}</p>
                  </div>
                </div>
                {role.permissions.includes(PERMISSIONS.MANAGE_MONEY) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                    <FaMoneyBillWave /> Money access
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{role.summary}</p>
              <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <strong className="text-gray-700 dark:text-gray-200">Best for:</strong> {role.recommendedFor}
              </p>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Permissions</p>
                {role.permissions.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No internal business permissions. Standard community access only.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {role.permissions.map((permission) => (
                      <li key={permission} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <FaCheckCircle className="mt-0.5 flex-shrink-0 text-green-500" />
                        <span>{permissionLabels[permission]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
