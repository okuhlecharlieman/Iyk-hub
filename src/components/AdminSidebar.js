'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTachometerAlt, FaTasks, FaUsers, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { href: '/admin/opportunities', label: 'Opportunities', icon: <FaTasks /> },
    { href: '/admin/users', label: 'Users', icon: <FaUsers /> },
  ];

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col">
      <div className="text-2xl font-bold mb-10">Admin Panel</div>
      <nav className="flex-grow">
        <ul>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href} className="mb-4">
                <Link
                  href={link.href}
                  className={`flex items-center p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div>
        <button onClick={logout} className="w-full flex items-center p-2 rounded-lg text-left hover:bg-red-600 transition-colors">
            <span className="mr-3"><FaSignOutAlt /></span>
            Logout
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
