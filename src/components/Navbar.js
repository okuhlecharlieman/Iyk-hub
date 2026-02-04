'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ThemeSwitcher from './ThemeSwitcher';
import { FaBars, FaTimes, FaUserCircle } from 'react-icons/fa';

const NavLink = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}>
        {children}
    </Link>
  );
};

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/games", label: "Games" },
    { href: "/showcase", label: "Showcase" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-white">
              <img src="/logo.png" className="h-9 w-9" alt="Intwana Hub Logo" />
              <span className="hidden sm:inline">Intwana Hub</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <nav className="flex items-center space-x-1">
              {navLinks.map(link => <NavLink key={link.href} href={link.href}>{link.label}</NavLink>)}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
                {!loading && user ? (
                    <div className="flex items-center gap-3">
                        <Link href="/profile" className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                          <img src={user.photoURL || '/logo.png'} className="h-8 w-8 rounded-full object-cover" alt="profile" />
                        </Link>
                        <button onClick={() => signOut(auth)} className="font-medium text-sm text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">Logout</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/login" className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2">Login</Link>
                        <Link href="/signup" className="font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">Sign up</Link>
                    </div>
                )}
            </div>
            <ThemeSwitcher />
            <div className="md:hidden flex items-center">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Open main menu"
                >
                    {isMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => <NavLink key={link.href} href={link.href}>{link.label}</NavLink>)}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
              {!loading && user ? (
                <div className="flex items-center gap-3 px-3">
                  <Link href="/profile">
                    <img src={user.photoURL || ''} className="h-10 w-10 rounded-full object-cover" alt="profile" />
                  </Link>
                  <div>
                    <p className="text-base font-medium text-gray-800 dark:text-white">{user.displayName}</p>
                    <button onClick={() => { signOut(auth); setIsMenuOpen(false); }} className="text-sm font-medium text-red-600 dark:text-red-400">Logout</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                   <Link href="/login" className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Login</Link>
                   <Link href="/signup" className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
