'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTachometerAlt, FaTasks, FaUsers, FaSignOutAlt, FaHome, FaMoneyBillWave, FaTrophy, FaBars, FaTimes, FaCrown, FaBuilding } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useState } from 'react';

const AdminSidebar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { href: '/admin/opportunities', label: 'Opportunities', icon: <FaTasks /> },
    { href: '/admin/InstitutionPlans', label: 'Institution Plans', icon: <FaBuilding /> },
    { href: '/admin/users', label: 'Users', icon: <FaUsers /> },
    { href: '/admin/payments', label: 'Revenue Management', icon: <FaMoneyBillWave /> },
    { href: '/admin/sponsored-challenges', label: 'Challenges', icon: <FaTrophy /> },
  ];

  const navContent = (
    <>
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/20">
              <FaCrown className="text-white text-lg" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800 dark:text-white block">Admin</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Manage platform</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <FaTimes />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-3">Menu</p>
        <ul className="space-y-0.5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center py-2.5 px-3 rounded-xl transition-all text-sm gap-3 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className={`text-base ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center py-2.5 px-3 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors gap-3">
          <span className="text-base text-gray-400"><FaHome /></span>
          <span className="font-medium">Back to Site</span>
        </Link>
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center py-2.5 px-3 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors gap-3"
        >
          <span className="text-base"><FaSignOutAlt /></span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-40 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-2.5 border border-gray-200 dark:border-gray-700"
        aria-label="Open admin menu"
      >
        <FaBars className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - desktop always visible, mobile slide-in */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        bg-white dark:bg-gray-800 w-64 h-screen flex flex-col
        border-r border-gray-200 dark:border-gray-700 shadow-sm
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {navContent}
      </aside>
    </>
  );
};

export default AdminSidebar;
