'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTachometerAlt, FaTasks, FaUsers, FaSignOutAlt, FaHome, FaMoneyBillWave, FaCrown } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const AdminSidebar = () => {
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { href: '/admin/opportunities', label: 'Opportunities', icon: <FaTasks /> },
    { href: '/admin/users', label: 'Users', icon: <FaUsers /> },
    { href: '/admin/payments', label: 'Payments', icon: <FaMoneyBillWave /> },
  ];

  return (
    <aside className="bg-white dark:bg-gray-800 w-64 min-h-screen flex flex-col border-r border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-2">
            <FaCrown className="text-white text-lg" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-800 dark:text-white block">Admin Panel</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Manage your platform</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">Navigation</p>
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center py-2.5 px-3 rounded-lg transition-all text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3 text-base">{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <Link href="/dashboard" className="flex items-center py-2.5 px-3 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <span className="mr-3 text-base"><FaHome /></span>
          <span className="font-medium">Back to Site</span>
        </Link>
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center py-2.5 px-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          <span className="mr-3 text-base"><FaSignOutAlt /></span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
