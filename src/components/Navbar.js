'use client';
import { useState, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ThemeSwitcher from './ThemeSwitcher';
import { FaBars, FaTimes, FaUserCircle, FaShieldAlt } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';

const NavLink = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        {children}
    </Link>
  );
};

const MobileNavLink = ({ href, children, onClick }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
  
    return (
      <Link href={href} onClick={onClick} className={`block px-4 py-3 rounded-lg text-base font-medium ${isActive ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          {children}
      </Link>
    );
  };

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const adminUID = process.env.NEXT_PUBLIC_ADMIN_UID; // Ensure you have this in your .env.local

  const navLinks = [
    { href: "/games", label: "Games" },
    { href: "/showcase", label: "Showcase" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-xl text-gray-800 dark:text-white">
              <img src="/logo.png" className="h-10 w-10" alt="Intwana Hub Logo" />
              <span className="hidden sm:inline">Intwana Hub</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <nav className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-lg">
              {navLinks.map(link => <NavLink key={link.href} href={link.href}>{link.label}</NavLink>)}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="hidden md:flex items-center">
                {!loading && user ? (
                    <Menu as="div" className="relative">
                        <Menu.Button className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                          <img src={user.photoURL || '/logo.png'} className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-500" alt="profile" />
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                               <div className="px-1 py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link href="/profile" className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex rounded-md items-center w-full px-2 py-2 text-sm text-gray-900 dark:text-gray-200`}>
                                           <FaUserCircle className="mr-2"/> Profile
                                        </Link>
                                    )}
                                </Menu.Item>
                                {user && user.uid === 'X0Svef3tYpY6aHqVWt0iPJr2C7A3' && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link href="/admin" className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex rounded-md items-center w-full px-2 py-2 text-sm text-gray-900 dark:text-gray-200`}>
                                               <FaShieldAlt className="mr-2"/> Admin
                                            </Link>
                                        )}
                                    </Menu.Item>
                                )}
                               </div>
                               <div className="px-1 py-1">
                                <Menu.Item>
                                     {({ active }) => (
                                        <button onClick={() => signOut(auth)} className={`${active ? 'bg-red-500 text-white' : 'text-red-600'} group flex rounded-md items-center w-full px-2 py-2 text-sm font-medium`}>
                                            Logout
                                        </button>
                                    )}
                                </Menu.Item>
                               </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/login" className="font-semibold text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2 transition-colors">Login</Link>
                        <Link href="/signup" className="font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all">Sign up</Link>
                    </div>
                )}
            </div>
            <div className="md:hidden flex items-center">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Open main menu"
                >
                    {isMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
                </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      <Transition
        show={isMenuOpen}
        as="div"
        className="md:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md"
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 -translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
          <div className="px-2 pt-2 pb-6 space-y-1 sm:px-3">
            {navLinks.map(link => <MobileNavLink key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>{link.label}</MobileNavLink>)}
            {user && user.uid === 'X0Svef3tYpY6aHqVWt0iPJr2C7A3' && <MobileNavLink href="/admin" onClick={() => setIsMenuOpen(false)}>Admin</MobileNavLink>}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-3">
              {!loading && user ? (
                <div className="px-2">
                    <div className="flex items-center gap-3 mb-3">
                        <img src={user.photoURL || '/logo.png'} className="h-11 w-11 rounded-full object-cover" alt="profile" />
                        <div>
                            <p className="text-base font-bold text-gray-800 dark:text-white">{user.displayName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                    </div>
                    <MobileNavLink href="/profile" onClick={() => setIsMenuOpen(false)}>My Profile</MobileNavLink>
                    <button onClick={() => { signOut(auth); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50">Logout</button>
                </div>
              ) : (
                <div className="space-y-2">
                   <MobileNavLink href="/login" onClick={() => setIsMenuOpen(false)}>Login</MobileNavLink>
                   <MobileNavLink href="/signup" onClick={() => setIsMenuOpen(false)}>Sign Up</MobileNavLink>
                </div>
              )}
            </div>
          </div>
      </Transition>
    </header>
  );
}
